// Request settings from the extension's localStorage and kick things off
chrome.extension.sendRequest({type: "getprefs"}, function(response)
{
    cachedSettings = response;
    UIL.init();
});
