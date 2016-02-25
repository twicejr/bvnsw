var app =
{
    refresh_interval: 0, //Milliseconds. 0 = disable
    nav_count: 0,
    done: false,
    ready: false,
    lang: 'nl',
    state_online: null,
    remote: 'http://appserver.wsvnb.nl/api/json/',
    api_page: 'pages',
    api_pagesum: 'pagesum',
    folder: 'wsnvbapp',
    cacheFile: 'pages.json',
    initialize: function()
    {
        if(app.ready)
        {
            console.log('Already ready. Back button was pressed to exit!');
            //navigator.app.exitApp();
        }
        else
        {
            console.log('Initialization & binding of events..');
            app.bindEvents();
        }
    },
    backButton: function(e)
    {
        if(app.activePage().is($('.page.homepage')))
        {
            console.log('Exit app; we are on the homepage..');
            navigator.app.exitApp();
        }
        else 
        {
            console.log('Going back a page.');
            navigator.app.backHistory();
        }
    },
    bindEvents: function()
    {
        document.addEventListener("backbutton", app.backButton);

        document.addEventListener('deviceready', app.initialized, false);
        document.addEventListener('online', app.onOnline, false);
        document.addEventListener('offline', app.onOffline, false);
        document.addEventListener('offlineswitch', app.offlineSwitch, false);
        document.addEventListener('onlineswitch', app.whenReady, false);
        document.addEventListener("resume", app.whenReady, false);

        if(app.refresh_interval)
        {
            setInterval(function()
            {
                app.whenReady();
            }, app.refresh_interval);
        }
    },
    initialized: function()
    {
        //Status bar fix for Apple with plugin...
        StatusBar.overlaysWebView(false);
        
        app.ready = true;
        
        $('body').on('click', 'a.external', function() //@todo: detect the external links automatically...
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
                app.lang = locale.value == 'nl-NL' ? 'nl' : 'en'; //@todo: find a good solution.
                
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
        if(app.ready)
        {
            if(!app.done)
            {
                //Check for contents after the filesystem is ready.
                fs.prepare(app.checkData);
            }
            else
            {
                //Just check for contents (again)
                app.checkData();
            }
        }
    },
    checkData: function()
    {
        console.log('Checking to see if there is new content');
        
        var cachefile_location = fs.buildFileUrl(app.folder + '/' + app.cacheFile);

        //Check if file exists.
        fs.getFileContents(cachefile_location, function(data)
        {
            if(!data || data === -1)
            {   //No data exists so download it now.
                if(data === -1) //File parsererror. Server bogus last time?
                {                    
                    console.log('Removing erroneous file: ' + cachefile_location);
                    fs.removeFile(cachefile_location);
                }
                app.completeRefresh(); //Retry downloading now!
                return;
            }
           
            var checksum = data.details.sum;
            fs.getFileContents(app.remote + app.api_pagesum, function(checksumdata)
            {
                if(checksumdata)
                {
                    if(checksumdata.details == checksum)
                    {
                        console.log('Using existing dataset');
                        app.utilizeData(data.details); //Reuse date
                    }
                    else
                    {
                        console.log('Fetch new dataset');
                        app.completeRefresh();
                    }
                }
                else if(data.details)
                {
                    //No internet
                    console.log('Use existing dataset (no internet)');
                    app.utilizeData(data.details);
                }
                else
                {
                    console.log("There's nothing we can do now. Let's tell the user we are sorry!");
                    app.excuseUs();
                }
            });
        });
    },
    excuseUs: function()
    {
        console.log('(todo say sorry to the user / fix a bug on the serverside!)');
    },
    completeRefresh: function()
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
        fs.getFileContents(filename, function(data)
        {
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
        console.log('Utilize the dataset!');
        app.setCss(dataset.css);
        app.setJs(dataset.js);
        
        //Parse special data        
        app.initJqueryMobile(dataset.pagedata);
        app.changePage(app.getHomepage());
        
        if(dataset.specialdata)
        {
            backbone.specialism(dataset.specialdata);
        }
        
        app.done = true; //Done :)
        $(document).trigger('appready');
    },
    setCss: function(css)
    {
        if(!css)
        {
            return;
        }
        console.log('Setting css');
        $('#css_remote').remove();
        $('head').append('<style type="text/css" id="css_remote">' + css + '</style>');
    },
    setJs: function(js)
    {
        if(!js)
        {
            return;
        }
        console.log('Setting js');
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
    preProcessHtml: function()
    {
        $('.section_edit').each(function()
        {
            $(this).find('input[type="date"]').change(function()
            {
                var nextOne = $(this).parent().parent().parent().next();
                while(nextOne.length)
                {
                    nextOne.find('input[type="date"]').attr('min', $(this).val());
                    nextOne = nextOne.next();
                }
                var prevOne = $(this).parent().parent().parent().prev();
                while(prevOne.length)
                {
                    prevOne.find('input[type="date"]').attr('max', $(this).val());
                    prevOne = prevOne.prev();
                }
            });
        });
    },
    initJqueryMobile: function(pagedata)
    {
        $('body').html(pagedata);               //Put data.
        
        app.preProcessHtml();
        
        $('body').pagecontainer                 //Bind events
        ({
            change: function( event, ui )
            {
                console.log('Set page to ' + ui.toPage.attr('id'));
            }
        });
        $('.app').removeClass('initializing');
        $('.spinner').remove();
        $("[data-role='footer']").toolbar();    // Fix the footer :)
    },
    replacePageArticle: function(html)
    {
        $('#' + app.activePage().attr('id') + ' article').html(html).trigger("create"); //retrigger jquery ui.
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
