var app =
{
    nav_count: 0,
    done: false,
    ready: false,
    lang: 'nl',
    state_online: null,
    remote: 'http://192.168.1.7/testappserver/api/json/', //@todo: change it to the appropriate.
    api_page: 'pages',
    api_pagesum: 'pagesum',
    folder: 'wsnvbdata',
    cacheFile: 'pages.json',
    initialize: function()
    {
        if(app.ready)
        {
            console.log('Already ready. Back button was pressed to exit!');            
            navigator.app.exitApp();
        }
        else
        {
            console.log('Initialization & binding of events..');
            app.bindEvents();
        }
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
                app.lang = locale.value == 'nl-NL' ? 'nl' : 'en'; //@todo: cleaner solution.
                
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
            if(!data || data === -1)
            {   //No data exists so download it now.
                
                if(data === -1) //File parsererror. Server bogus?
                {
                    //clear the crap
                    console.log('Removing erroneous file: ' + cachefile_location);
                    fs.removeFile(cachefile_location);
                }
                app.initialFetch();
                return;
            }
           
            var checksum = data.details.sum;
            fs.getFileContents(app.remote + app.api_pagesum, function(checksumdata)
            {
                if(checksumdata && checksumdata.details == checksum)
                {
                    app.utilizeData(data.details);
                }
                else if(data.details)
                {
                    //It failed! Are we online? Use old data anyway
                    app.utilizeData(data.details);
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
        console.log('1. utilizing downloaded file: ' + filename);
        fs.getFileContents(filename, function(data)
        {
            console.log('..2');
            app.utilizeData(data.details);
        });
    },
    utilizeData: function(dataset)
    {
        if(dataset == undefined)
        {
            console.log('Error: no data.');
            return;
        }
        
        //Use serverdata
        console.log('Utilize serverdata');
        app.setCss(dataset.css);
        app.setJs(dataset.js);
        
        app.specialism(dataset);
        app.initJqueryMobile(dataset.pagedata);
        app.changePage(app.getHomepage());
        
        app.done = true; //Done :)
        $(document).trigger('appready');
    },
    specialism: function(dataset)
    {
        $.each(dataset, function(key, value)
        {
            console.log(key);
            console.log(value);
            switch(key)
            {
                case 'notify_new':
                    console.log(value.page_id);
                    console.log(value.timestamp);
                break;
            }
        });
    },
    setCss: function(css)
    {
        console.log('Setting css');
        if(!css)
        {
            return;
        }
        $('#css_remote').remove();
        $('head').append('<style type="text/css" id="css_remote">' + css + '</style>');
    },
    setJs: function(js)
    {
        console.log('Setting js');
        if(!js)
        {
            return;
        }
        $('#js_remote').remove();
        $('head').append('<script type="text/javascript" id="js_remote">' + js + '</script>');
    },
    activePage: function()
    {
        return $('body').pagecontainer('getActivePage');
    },
    changePage: function(page_id)
    {
        $('body').pagecontainer('change', page_id);
    },
    initJqueryMobile: function(pagedata)
    {
        $('body').html(pagedata);               //Put data.
        $('body').pagecontainer                 //Bind events
        ({
            change: function( event, ui )
            {
                console.log('Set page to ' + ui.toPage.attr('id'));
            }
        });
        $('.app').removeClass('initializing');  // We aren't loading anymore.. remove any spinners.
        $("[data-role='footer']").toolbar();    // Fix the footer :)
    },
    replacePageArticle: function(html)
    {
        $('#' + app.activePage().attr('id') + ' article').html(html).trigger("create");
    },
    getHomepage: function()
    {
        var activePageId = app.activePage().attr('id');
        if(activePageId)
        {
            return '#' + activePageId;
        }
        return '#' + $('.page.homepage').attr('id');
    },
    showPopup: function(content)
    {
        $('#popup').remove(); //Remove any old popups
        var popupElem = $('<div data-role="popup" id="popup" data-transition="flip">' + content + '</div>');
        popupElem.appendTo('body');
        popupElem.popup();       //Init
        popupElem.popup("open"); //Open
    }
};