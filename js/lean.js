$(document).on('appready', function()
{
    appready_after();
});

function appready_after()
{
    lean_ajax_form();
}

function lean_ajax_form()
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
            $.ajax({
                url: formURL,
                type: 'POST',
                data: formData,
                mimeType: "multipart/form-data",
                contentType: false,
                cache: false,
                processData: false,
                complete: function()
                {
                },
                success: function(data, textStatus, jqXHR)
                {
                    loadJsonResponse(data);
                },
                error: function(jqXHR, textStatus, errorThrown)
                {
                    /*@todo: error handling.........*/
                }
            });
            e.preventDefault();
        });        
    });    
}

function loadJsonResponse(jsonResponse)
{
    try 
    {
        console.log('loading response..');
        var json = JSON.parse(jsonResponse);
        if(json.html)
        {
            var curpage_id = $.mobile.activePage.attr("id");
            $('#' + curpage_id + ' article').html(json.html); //Thank you, server :)
            
            //todo: post jquerymobile processing.
            
            appready_after();
        }
        if(json.popup)
        {
            $('#popup').remove();
            $('<div data-role="popup" id="popup">' + json.popup + '</div>').appendTo('body').popup().popup("open");
        }
    } 
    catch (err)
    {
        console.log('..failed because: ' + err);
        return false;
    }
}
