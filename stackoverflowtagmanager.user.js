// ==UserScript==
// @name           Stack Overflow Tag Manager
// @namespace      http://www.jonathanbuchanan.plus.com/repos/greasemonkey/
// @description    Hides questions on the home page and main question list which have certain uninteresting tags, unless they also have some interesting tags
// @include        http://stackoverflow.com/
// @include        http://stackoverflow.com/questions
// @include        http://stackoverflow.com/questions/
// @include        http://stackoverflow.com/questions?*
// ==/UserScript==

/*
CHANGELOG
---------
2008-09-24 Tidied documentation and completed missing pieces.
2008-09-24 Now works on the front page as well.
2008-09-24 Initial version.
*/

/**
 * Miscellaneous utility functions.
 *
 * @namespace
 */
var Utilities =
{
    /**
     * Creates a function which, when executed, calls the given function with
     * the given context object as "this".
     *
     * @param {Function} func the function to be executed at a later time.
     * @param context the object which will be referenced by "this" during the
     *                function call.
     *
     * @return a function which will, when executed, execute <code>func</code>
     *         with <code>context</code> as "this".
     * @type Function
     */
    bind: function(func, context)
    {
        return function()
        {
            func.apply(context, arguments);
        };
    },

    /**
     * Updates an object's properties with other objects' properties.
     *
     * @param {Object} destination the object to be updated.
     * @param {Object} [source] all further arguments will have their properties
     *                          copied to the <code>destination</code> object in
     *                          the order given.
     *
     * @return the <code>destination</code> object.
     * @type Object
     */
    extendObject: function(destination)
    {
        for (var i = 1, l = arguments.length; i < l; i++)
        {
            var source = arguments[i];
            for (var property in source)
            {
                if (source.hasOwnProperty(property))
                {
                    destination[property] = source[property];
                }
            }
        }
        return destination;
    }
};

/**
 * Handles tag configuration and determines which questions should be ignored.
 *
 * @namespace
 */
var TagConfig =
{
    /**
     * Loads initial tag preferences.
     */
    init: function()
    {
        this.ignoredTags = this.loadTags("ignoredTags");
        this.interestingTags = this.loadTags("interestingTags");
    },

    /**
     * Loads a sorted list of tags from the setting with the given name, which
     * is assumed to specify tags in a comma-delimited format.
     *
     * @param {String} settingName the name of the setting under which tags are
     *                             stored.
     *
     * @return a sorted list of tags.
     * @type String[]
     */
    loadTags: function(settingName)
    {
        var tags = [];
        var storedTags = GM_getValue(settingName, "");
        if (storedTags)
        {
            tags = storedTags.split(",");
        }
        tags.sort();
        return tags;
    },

    /**
     * Saves tags to the setting with the given name, as comma-delimited text.
     *
     * @param {String} settingName the name of the setting under which tags are
     *                             to be stored.
     * @param {String[]} tags tag details to be saved.
     */
    saveTags: function(settingName, tags)
    {
        GM_setValue(settingName, tags.join(","));
    },

    /**
     * Adds an ignored tag and saves.
     *
     * @param {String} tag the tag to be ignored.
     */
    addIgnoredTag: function(tag)
    {
        this.ignoredTags.push(tag);
        this.ignoredTags.sort();
        this.saveTags("ignoredTags", this.ignoredTags);
    },

    /**
     * Adds an interesting tag and saves.
     *
     * @param {String} tag the tag to be marked as interesting.
     */
    addInterestingTag: function(tag)
    {
        this.interestingTags.push(tag);
        this.interestingTags.sort();
        this.saveTags("interestingTags", this.interestingTags);
    },

    /**
     * Removes an ignored tag and saves.
     *
     * @param {String} tag the tag to be unignored.
     */
    removeIgnoredTag: function(tag)
    {
        var index = this.ignoredTags.indexOf(tag);
        if (index != -1)
        {
            this.ignoredTags.splice(index, 1);
            this.saveTags("ignoredTags", this.ignoredTags);
        }
    },

    /**
     * Removes an interesting tag and saves.
     *
     * @param {String} tag the tag to be unmarked as interesting.
     */
    removeInterestingTag: function(tag)
    {
        var index = this.interestingTags.indexOf(tag);
        if (index != -1)
        {
            this.interestingTags.splice(index, 1);
            this.saveTags("interestingTags", this.interestingTags);
        }
    },

    /**
     * Determines if a given question should be ignored, based on its tags
     * and the currently configured list of ignored and interesting tags.
     * <p>
     * Interesting tags trump ignored tags.
     *
     * @param {Question} question the question whose tags will be examined.
     *
     * @return <code>true</code> if the given question should be ignored,
     *         <code>false</code> otherwise.
     * @type Boolean
     */
    questionShouldBeIgnored: function(question)
    {
        var ignore = false;
        for (var i = 0, l = question.tags.length; i < l; i++)
        {
            var tag = question.tags[i];

            if (!ignore && this.ignoredTags.indexOf(tag) != -1)
            {
                ignore = true;
            }

            if (this.interestingTags.indexOf(tag) != -1)
            {
                ignore = false;
                break;
            }
        }
        return ignore;
    }
};

/**
 * Handles the configuration form which will display existing configuration
 * details and allow the user to add and remove tags.
 *
 * @namespace
 */
var ConfigurationForm =
{
    /**
     * Creates the configuration form.
     *
     * @param {TagManagerPage} page the page object for the current page.
     */
    init: function(page)
    {
        this.page = page;
        this.form = document.createElement("form");
        this.form.name = "tagManagerConfigurationForm";

        var ignoredTagsHeader = document.createElement("h4");
        ignoredTagsHeader.appendChild(document.createTextNode("Ignored Tags"));

        this.ignoredTags = document.createElement("div");
        this.ignoredTags.id = "ignoredTags";
        this.ignoredTags.className = "tags";
        this.updateIgnoredTagDisplay();

        var ignoreTagFields = document.createElement("p");
        this.ignoreTagInput = document.createElement("input");
        this.ignoreTagInput.type = "text";
        this.ignoreTagInput.name = "ignoreTag";
        this.ignoreTagInput.addEventListener(
            "keypress", this.keyPressHandler(this.addIgnoredTag), false);
        var ignoreTagButton = document.createElement("input");
        ignoreTagButton.type = "button";
        ignoreTagButton.value = "Add";
        ignoreTagButton.addEventListener(
            "click", Utilities.bind(this.addIgnoredTag, this), false);
        ignoreTagFields.appendChild(this.ignoreTagInput);
        ignoreTagFields.appendChild(document.createTextNode(" "));
        ignoreTagFields.appendChild(ignoreTagButton);

        var interestingTagsHeader = document.createElement("h4");
        interestingTagsHeader.appendChild(document.createTextNode("Interesting Tags"));

        this.interestingTags = document.createElement("div");
        this.interestingTags.id = "interestingTags";
        this.interestingTags.className = "tags";
        this.updateInterestingTagDisplay();

        var interestingTagFields = document.createElement("p");
        this.interestingTagInput = document.createElement("input");
        this.interestingTagInput.type = "text";
        this.interestingTagInput.name = "interestingTag";
        this.interestingTagInput.addEventListener(
            "keypress", this.keyPressHandler(this.addInterestingTag), false);
        var interestingTagButton = document.createElement("input");
        interestingTagButton.type = "button";
        interestingTagButton.value = "Add";
        interestingTagButton.addEventListener(
            "click", Utilities.bind(this.addInterestingTag, this), false);
        interestingTagFields.appendChild(this.interestingTagInput);
        interestingTagFields.appendChild(document.createTextNode(" "));
        interestingTagFields.appendChild(interestingTagButton);

        this.form.appendChild(ignoredTagsHeader);
        this.form.appendChild(this.ignoredTags);
        this.form.appendChild(ignoreTagFields);
        this.form.appendChild(interestingTagsHeader);
        this.form.appendChild(this.interestingTags);
        this.form.appendChild(interestingTagFields);
    },

    /**
     * Event handler for adding an ignored tag.
     */
    addIgnoredTag: function()
    {
        var tag = this.ignoreTagInput.value;
        if (!tag)
        {
            return;
        }

        if (tag.indexOf(",") != -1)
        {
            alert("No commas, please!");
            return;
        }
        else if (TagConfig.ignoredTags.indexOf(tag) != -1)
        {
            alert("You're already ignoring this tag.");
            this.ignoreTagInput.value = "";
            return;
        }
        else if (TagConfig.interestingTags.indexOf(tag) != -1)
        {
            if (confirm("This tag is currently marked as interesting - do you want to ignore it instead?"))
            {
                TagConfig.removeInterestingTag(tag);
                this.updateInterestingTagDisplay();
            }
            else
            {
                this.ignoreTagInput.value = "";
                return;
            }
        }

        TagConfig.addIgnoredTag(tag);
        this.ignoreTagInput.value = "";
        this.updateIgnoredTagDisplay();
        this.page.updateQuestionDisplay();
        this.ignoreTagInput.focus();
    },

    /**
     * Event handler for adding an interesting tag.
     */
    addInterestingTag: function()
    {
        var tag = this.interestingTagInput.value;
        if (!tag)
        {
            return;
        }

        if (tag.indexOf(",") != -1)
        {
            alert("No commas, please!");
            return;
        }
        else if (TagConfig.interestingTags.indexOf(tag) != -1)
        {
            alert("This tag is already marked as interesting.");
            this.interestingTagInput.value = "";
            return;
        }
        else if (TagConfig.ignoredTags.indexOf(tag) != -1)
        {
            if (confirm("You're currently ignoring this tag - do you want to mark it as interesting instead?"))
            {
                TagConfig.removeIgnoredTag(tag);
                this.updateIgnoredTagDisplay();
            }
            else
            {
                this.interestingTagInput.value = "";
                return;
            }
        }

        TagConfig.addInterestingTag(tag);
        this.interestingTagInput.value = "";
        this.updateInterestingTagDisplay();
        this.page.updateQuestionDisplay();
        this.interestingTagInput.focus();
    },

    /**
     * Creates an event handler which uses the given function to add a tag when
     * the user presses the return key.
     *
     * @param {Function} addTagFunc the {@link ConfigurationForm} function to be
     *                              used to add a new tag.
     *
     * @return an event handling function.
     * @type Function
     */
    keyPressHandler: function(addTagFunc)
    {
        return Utilities.bind(function(e)
        {
            if (e.which == 13)
            {
                addTagFunc.call(this);
            }
        }, this);
    },

    /**
     * Event handler for removing an ignored tag.
     *
     * @param {Event} e the event being handled.
     */
    removeIgnoredTag: function(e)
    {
        this._removeTag(e,
                        TagConfig.removeIgnoredTag,
                        this.updateIgnoredTagDisplay);
    },

    /**
     * Event handler for removing an interesting tag.
     *
     * @param {Event} e the event being handled.
     */
    removeInterestingTag: function(e)
    {
        this._removeTag(e,
                        TagConfig.removeInterestingTag,
                        this.updateInterestingTagDisplay);
    },

    /**
     * Does the real work for removing tags - preventing the tag link from
     * being followed, using TagConfig to update configuration and updating
     * display of the appropriate tag configuration and questions.
     *
     * @param {Event} e the event being handled.
     * @param {Function} tagConfigFunc the {@link TagConfig} function to be used
     *                                 to update tag configuration.
     * @param {Function} updateDisplayFunc the {@link ConfigurationForm}
     *                                    function to be used to update tag
     *                                    configuration display.
     */
    _removeTag: function(e, tagConfigFunc, updateDisplayFunc)
    {
        e.preventDefault();
        e.stopPropagation();
        tagConfigFunc.call(TagConfig, e.target.textContent);
        updateDisplayFunc.call(this);
        this.page.updateQuestionDisplay();
    },

    /**
     * Updates display of ignored tags.
     */
    updateIgnoredTagDisplay: function()
    {
        this._updateTagDisplay(this.ignoredTags,
                               TagConfig.ignoredTags,
                               "ignored",
                               this.removeIgnoredTag);
    },

    /**
     * Updates display of interesting tags.
     */
    updateInterestingTagDisplay: function()
    {
        this._updateTagDisplay(this.interestingTags,
                               TagConfig.interestingTags,
                               "interesting",
                               this.removeInterestingTag);
    },

    /**
     * Does the real work for updating display of tag configurations - creates
     * tag deletion links from scratch based on the current configuration.
     *
     * @param {HTMLElement} el the element holding tag deletion links to be
     *                         updated.
     * @param {String[]} tags the new list of tags to be displayed for deletion.
     * @param {String} type the type of tags being displayed -
     *                      <code>"ignored"</code> or
     *                      <code>"interesting"</code>.
     * @param {Function} deleteEventHandler the {@link ConfigurationForm}
     *                                      function to be registered as the
     *                                      event handler for tag deletion
     *                                      links.
     */
    _updateTagDisplay: function(el, tags, type, deleteEventHandler)
    {
        el.innerHTML = "";

        if (tags.length === 0)
        {
            return;
        }

        for (var i = 0, l = tags.length; i < l; i++)
        {
            var tag = tags[i];
            var tagLink = document.createElement("a");
            tagLink.className = "post-tag";
            tagLink.href = "/questions/tagged/" + encodeURIComponent(tag);
            tagLink.title = "delete " + type + " tag '" + tag + "'";
            tagLink.appendChild(document.createTextNode(tag));
            tagLink.addEventListener(
                "click", Utilities.bind(deleteEventHandler, this), false);
            el.appendChild(tagLink);
            if (i != l - 1)
            {
                el.appendChild(document.createTextNode(" "));
            }
        }
    }
};

/**
 * A question in a Stack Overflow question list page.
 *
 * @param {HTMLElement} element the HTML element representing the question.
 *
 * @constructor
 */
function Question(element)
{
    this.element = element;
    this.tags = [];

    var tagDiv = document.evaluate(".//div[@class='tags']",
                                   this.element,
                                   null,
                                   XPathResult.FIRST_ORDERED_NODE_TYPE,
                                   null).singleNodeValue;

    var tagLinks = tagDiv.getElementsByTagName("a");
    for (var i = 0, l = tagLinks.length; i < l; i++)
    {
        this.tags.push(tagLinks[i].textContent);
    }
    this.tags.sort();
}

Question.prototype =
{
    /**
     * Hides the element representing the question.
     */
    hide: function()
    {
        this.element.style.display = "none";
    },

    /**
     * Shows the element representing the question.
     */
    show: function()
    {
        this.element.style.display = "";
    }
};

/**
 * Base object for objects which will handle initialisation of Tag Manager
 * functionality on various pages.
 *
 * @constructor
 */
function TagManagerPage() {};
TagManagerPage.prototype =
{
    /**
     * Kicks off processing of the current page, performing all necessary
     * setup, including initialising all other components and inserting status
     * display and configuration controls into the page.
     */
    init: function()
    {
        TagConfig.init();

        this.questions = [];

        var questionDivs = this.getQuestionDivs();
        for (var i = 0, l = questionDivs.snapshotLength; i < l; i++)
        {
            this.questions.push(new Question(questionDivs.snapshotItem(i)));
        }

        // Create module in sidebar
        var module = document.createElement("div");
        module.id = "tagManager";
        module.className = "module";

        this.hiddenQuestionStatus = document.createElement("p");
        this.hiddenQuestionStatus.id = "hiddenQuestionStatus";
        module.appendChild(this.hiddenQuestionStatus);

        ConfigurationForm.init(this);
        module.appendChild(ConfigurationForm.form);

        var insertionTarget = this.getModuleInsertionTarget();
        insertionTarget.parentNode.insertBefore(module, insertionTarget);

        this.updateQuestionDisplay();
    },

    /**
     * Retrieves elements representing questions on the current page.
     * <p>
     * This method must be implemented by objects which inherit from
     * <code>TagManagerPage</code> or an <code>Error</code> will be thrown.
     *
     * @returns the result of an XPATH lookup for elements representing
     *          questions.
     * @type XPathResult
     */
    getQuestionDivs: function()
    {
        throw new Error("getQuestionDivs must be implemented by inheritors.");
    },

    /**
     * Retrieves the element which the Tag Manager configuration module should
     * be inserted before.
     * <p>
     * This method must be implemented by objects which inherit from
     * <code>TagManagerPage</code> or an <code>Error</code> will be thrown.
     *
     * @returns the element which the Tag Manager configuration module should be
     *          inserted before.
     * @type HTMLElement
     */
    getModuleInsertionTarget: function()
    {
        throw new Error("getModuleInsertionTarget must be implemented by inheritors.");
    },

    /**
     * Updates display of each question on the page based on the current
     * configuration of ignored and interesting tags.
     */
    updateQuestionDisplay: function()
    {
        var hiddenQuestions = 0;

        for (var i = 0, l = this.questions.length; i < l; i++)
        {
            var question = this.questions[i];
            if (TagConfig.questionShouldBeIgnored(question))
            {
                question.hide();
                hiddenQuestions++;
            }
            else
            {
                question.show();
            }
        }

        this.updateHiddenQuestionCount(hiddenQuestions);
    },

    /**
     * Updates details about the number of questions which are currently hidden.
     *
     * @param {Number} count the number of questions which are hidden.
     */
    updateHiddenQuestionCount: function(count)
    {
        this.hiddenQuestionStatus.innerHTML = "";
        this.hiddenQuestionStatus.appendChild(document.createTextNode("You're ignoring "));
        var hiddenQuestionCount = document.createElement("strong");
        hiddenQuestionCount.appendChild(document.createTextNode(count));
        this.hiddenQuestionStatus.appendChild(hiddenQuestionCount);
        this.hiddenQuestionStatus.appendChild(document.createTextNode(
            " question" + (count == 1 ? "" : "s") + " based on " +
            (count == 1 ? "its" : "their") + " tags."));
    }
};

/**
 * Handles initialisation of Tag Manager functionality on the front page.
 *
 * @constructor
 * @augments TagManagerPage
 */
function FrontPage() { };
FrontPage.prototype = new TagManagerPage();
Utilities.extendObject(FrontPage.prototype,
{
    getQuestionDivs: function()
    {
        return document.evaluate(".//div[contains(@class, 'question-summary')]",
                                 document.getElementById("mainbar"),
                                 null,
                                 XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                                 null);
    },

    getModuleInsertionTarget: function()
    {
        return document.evaluate(".//div[@class='module' and position()=1]",
                                 document.getElementById("sidebar"),
                                 null,
                                 XPathResult.FIRST_ORDERED_NODE_TYPE,
                                 null).singleNodeValue;
    }
});

/**
 * Handles initialisation of Tag Manager functionality on the questions page.
 *
 * @constructor
 * @augments TagManagerPage
 */
function QuestionsPage() {};
QuestionsPage.prototype = new TagManagerPage();
Utilities.extendObject(QuestionsPage.prototype,
{
    getQuestionDivs: function()
    {
        return document.evaluate(".//div[@class='question-summary']",
                                 document.getElementById("question"),
                                 null,
                                 XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                                 null);
    },

    getModuleInsertionTarget: function()
    {
        return document.evaluate(".//div[@class='module' and position()=last()]",
                                 document.getElementById("sidebar"),
                                 null,
                                 XPathResult.FIRST_ORDERED_NODE_TYPE,
                                 null).singleNodeValue;
    }
});

if (window.location.href.indexOf("questions") != -1)
{
    new QuestionsPage().init();
}
else
{
    new FrontPage().init();
}
