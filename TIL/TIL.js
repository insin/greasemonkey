// Request settings from the extension's localStorage and kick things off
var folderNames = TIL.Config.getFolderNamesFromCurrentPage();
chrome.extension.sendRequest({type: "getprefs", folderNames: folderNames}, function(response)
{
    cachedSettings = response;
    TIL.init();
});
