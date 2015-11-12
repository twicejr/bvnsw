$(document).on('appready', function()
{
    backbone.appready();
});

var backbone =
{
    nav_count: 0,
    appready: function()
    {
        backbone.ajaxForm();
    },
    ajaxForm: function()
    {
        $('form').each(function()
        {
            if($(this).data('initialized'))
            {
                return; 
            }
            $(this).data('initialized', true);

            $(this).submit(function(e)
            {
                $(document).trigger('before-form-submit', $(this));

                //Hideit
                if(!$(this).data('nodisable'))
                {
                    $(this).find('button, input[type="submit"]').attr('disabled', 'disabled');
                    /*@todo: be able to undo this in case the request failed.*/
                }
                if(!$(this).data('keep-enabled'))
                {
                    $(this).find('input, button, select, textarea').each(function()
                    {
                        $(this).click(function(e)
                        {
                            e.preventDefault();
                            return false;
                        });
                        $(this).not('.hidden').fadeTo(1000, 0.3, function()
                        {
                        });
                    });
                }

                var formURL = $(this).attr('action') ? $(this).attr('action') : current_url();

                if($(this).attr('method') == 'GET')
                {
                    return false;
                }

                var formData = new FormData(this);

                console.log('Making ajax call to server...');
                $.ajax({
                    url: formURL,
                    type: 'POST',
                    data: formData,
                    mimeType: "multipart/form-data",
                    contentType: false,
                    cache: false,
                    processData: false,
                    headers: 
                    {
                        'x-is-apprequest': '1'
                    },
                    complete: function()
                    {
                    },
                    success: function(data, textStatus, jqXHR)
                    {
                        backbone.ajaxResponse(data);
                    },
                    error: function(jqXHR, textStatus, errorThrown)
                    {
                        console.log('Error: ' . textStatus);
                        /*@todo: error handling.........*/
                    }
                });

                e.preventDefault();
                return false;
            });        
        });    
    },
    ajaxResponse: function (jsonResponse)
    {
        try 
        {
            console.log('...loading response..');
            var json = JSON.parse(jsonResponse);
            if(json.html)
            {
                app.replacePageArticle(json.html);
                backbone.appready(); //reready.....
            }
            if(json.popup)
            {
                app.showPopup(json.popup);
            }
        } 
        catch (err)
        {
            console.log('..failed because: ' + err);
            return false;
        }
    }
};