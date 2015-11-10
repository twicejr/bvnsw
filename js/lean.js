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
    console.log('Ajax forms.');

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

function lean_ajax_form_get_doc(frame)
{
    var doc = null;

    // IE8 cascading access check
    try
    {
        if (frame.contentWindow)
        {
            doc = frame.contentWindow.document;
        }
    } catch (err){}

    if (doc)
    { // successful getting content
        return doc;
    }

    try 
    { // simply checking may throw in ie8 under ssl or mismatched protocol
        doc = frame.contentDocument ? frame.contentDocument : frame.document;
    } 
    catch (err)
    {
        // last attempt
        doc = frame.document;
    }
    return doc;
}

function loadJsonResponse(jsonResponse)
{
    try 
    {
        console.log('loading response..');
        var json = JSON.parse(jsonResponse);
        if(json.html)
        {
            var html = $('<div> ' + json.html + '</div>');
            
            /*Shamelessly replace the div found. This relies on the server and the generated content to be compatible with this special piece of code*/
            var founddivclass = html.find('div').attr('class');
            var curpage_id = $.mobile.activePage.attr("id");
            console.log('#' + curpage_id + ' div[class="' + founddivclass + '"]');
            $('#' + curpage_id + ' div[class="' + founddivclass + '"]').replaceWith(json.html).button();
            
            appready_after();
        }
    } 
    catch (err)
    {
        console.log('..failed because of: ' + err);
        return false;
    }
}
