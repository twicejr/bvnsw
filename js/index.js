var app =
{
    done: false,
    ready: false,
    lang: 'nl',
    state_online: null,
    remote: 'http://www.zppc.nl/appserver/api.php/api/json/read/', //@todo: change it to the appropriate.
    api_page: 'pages',
    api_pagesum: 'pagesum',
    folder: 'zppc',
    cacheFile: 'pages.json',
    initialize: function()
    {
        app.bindEvents();
    },
    bindEvents: function()
    {
        // Possible events: deviceready    pause    resume    backbutton    menubutton    searchbutton    startcallbutton    endcallbutton    volumedownbutton    volumeupbutton
        document.addEventListener('deviceready', app.initialized, false);
        
        //@see www/config.xml also!!
        // org.apache.cordova.network-information: online offline
        document.addEventListener('online', app.onOnline, false);
        document.addEventListener('offline', app.onOffline, false);
        document.addEventListener('offlineswitch', app.offlineSwitch, false);
        document.addEventListener('onlineswitch', app.whenReady, false);
        document.addEventListener("resume", app.whenReady, false);
    },
    initialized: function()
    {
        console.log('Device ready!');
        app.ready = true;
        
        $('body').on('click', 'a.external', function()
        {
            var url = $(this).attr('href');
            if(device.platform === 'Android')
            {
                console.log('External link opened');
                navigator.app.loadUrl(url, {openExternal:true});
            }
            else 
            {
                console.log('External link opened on iphone');
                window.open(url, '_system',  'location=yes');
            }
            return false;
        });
        
        navigator.globalization.getLocaleName
        (
            function (locale) 
            {
                //Add the language when it is available.
                //app.lang = locale.value; //nah never mind.
                app.api_page += '?lang=' + app.lang;
                app.api_pagesum += '?lang=' + app.lang;
            },
            function () {console.log('Language could not be detected!');}
        );
        app.whenReady();
    },
    onOffline: function()
    {
        if (app.state_online === false)
        {
            return;
        }
        app.state_online = false;
        var e = document.createEvent('Events');
        e.initEvent("offlineswitch");
        document.dispatchEvent(e);
    },
    onOnline: function()
    {
        console.log('We went online.');
        if (app.state_online === true)
        {
            console.log('..but we already were online and should have synced.');
            return;
        }
        app.state_online = true;
        var e = document.createEvent('Events');
        e.initEvent("onlineswitch");
        document.dispatchEvent(e);
    },
    offlineSwitch: function()
    {
        console.log('We went offline.');
    },
    whenReady: function()
    {
        if(app.ready && !app.done)
        {
            fs.prepare(app.checkData);
        }
    },
    checkData: function()
    {
        var cachefile_location = fs.buildFileUrl(app.folder + '/' + app.cacheFile);

        //Check if file exists.
        fs.getFileContents(cachefile_location, function(data)
        {
            if(!data)
            {   //No data exists so download it now.
                app.initialFetch();
                return;
            }
           
            var checksum = data.data.sum;
            //Data exists so use it when it is up to date.
            fs.getFileContents(app.remote + app.api_pagesum, function(checksumdata)
            {
                if(checksumdata && checksumdata.data == checksum)
                {
                    app.utilizeData(data);
                }
                else
                {
                    app.initialFetch();
                }
            });
        });
    },
    initialFetch: function()
    {
        console.log('Download complete file');
        fs.download(app.remote + app.api_page, app.cacheFile, app.folder, app.utilizeDownloadResult);
    },
    utilizeDownloadResult: function(filename)
    {
        if(!filename)
        {
            console.log('File did not download.');
            return;
        }
        console.log('Utilizing downloaded file: ' + filename);
        console.log('..1');
        fs.getFileContents(filename, function(data)
        {
            console.log('..3');
            app.utilizeData(data);
        });
        
        console.log('..2');
    },
    utilizeData: function(data)
    {
        console.log('Utilize data!');
        if(data == undefined || data.data == undefined)
        {
            console.log('undefined');
            return;
        }
        var dataset = data.data;
        
        if(typeof dataset.css !== null && dataset.css)
        {
            $('#style_remote').remove();
            $('head').append('<style type="text/css" id="style_remote">' + dataset.css + '</style>');
        }
        $('body').html(dataset.pagedata);
        
        var activePage = $.mobile.activePage.attr("id");
        if(activePage)
        {
            activePage = '#' + activePage;
        }
        else
        {
            activePage = '#home';
        }
        
        $('.app').removeClass('initializing');
        $( "[data-role='footer']" ).toolbar();
        $.mobile.changePage(activePage);
    //    $('a.ui-btn[href=' + activePage + ']').addClass('ui-btn-active');
        
        
        
        app.done = true; //All is loaded. Nothing needs to be loaded anymore.
    }
};