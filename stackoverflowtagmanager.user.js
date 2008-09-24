// ==UserScript==
// @name           Stack Overflow Tag Manager
// @namespace      http://www.jonathanbuchanan.plus.com/repos/greasemonkey/
// @description    Hides questions on the main question list with certain uninteresting tags, unless they also have some interesting tags
// @include        http://stackoverflow.com/questions
// @include        http://stackoverflow.com/questions/
// @include        http://stackoverflow.com/questions?*
// ==/UserScript==

/*
CHANGELOG
---------
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
     * @param {Function} func
     * @param context
     *
     * @type Function
     */
    bind: function(func, context)
    {
        return function()
        {
            func.apply(context, arguments);
        };
    }
};

/**
 * Handles tag configuration and determines if tags are ignored.
 *
 * @namespace
 */
var TagManager =
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
     * Saves tags to the setting with the given name as comma-delimited text.
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
     */
    addIgnoredTag: function(tag)
    {
        this.ignoredTags.push(tag);
        this.ignoredTags.sort();
        this.saveTags("ignoredTags", this.ignoredTags);
    },

    /**
     * Adds an interesting tag and saves.
     */
    addInterestingTag: function(tag)
    {
        this.interestingTags.push(tag);
        this.interestingTags.sort();
        this.saveTags("interestingTags", this.interestingTags);
    },

    /**
     * Removes an ignored tag and saves.
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
     * @param {Question} question the question to be inspected.
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
     */
    init: function()
    {
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
        else if (TagManager.ignoredTags.indexOf(tag) != -1)
        {
            alert("You're already ignoring this tag.");
            this.ignoreTagInput.value = "";
            return;
        }
        else if (TagManager.interestingTags.indexOf(tag) != -1)
        {
            if (confirm("This tag is currently marked as interesting - do you want to ignore it instead?"))
            {
                TagManager.removeInterestingTag(tag);
                this.updateInterestingTagDisplay();
            }
            else
            {
                this.ignoreTagInput.value = "";
                return;
            }
        }

        TagManager.addIgnoredTag(tag);
        this.ignoreTagInput.value = "";
        this.updateIgnoredTagDisplay();
        QuestionsPage.updateQuestionDisplay();
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
        else if (TagManager.interestingTags.indexOf(tag) != -1)
        {
            alert("This tag is already marked as interesting.");
            this.interestingTagInput.value = "";
            return;
        }
        else if (TagManager.ignoredTags.indexOf(tag) != -1)
        {
            if (confirm("You're currently ignoring this tag - do you want to mark it as interesting instead?"))
            {
                TagManager.removeIgnoredTag(tag);
                this.updateIgnoredTagDisplay();
            }
            else
            {
                this.interestingTagInput.value = "";
                return;
            }
        }

        TagManager.addInterestingTag(tag);
        this.interestingTagInput.value = "";
        this.updateInterestingTagDisplay();
        QuestionsPage.updateQuestionDisplay();
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
                        TagManager.removeIgnoredTag,
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
                        TagManager.removeInterestingTag,
                        this.updateInterestingTagDisplay);
    },

    /**
     * Does the real work for removing tags - preventing the tag link from
     * being followed, using TagManager to update configuration and updating
     * display of the appropriate tag configuration and questions.
     *
     * @param {Event} e the event being handled.
     * @param {Function} tagManagerFunc the {@link TagManager} function to be
     *                                  used to update tag configuration.
     * @param {Function updateDisplayFunc the {@link ConfigurationForm} function
     *                                    to be used to update tag configuration
     *                                    display.
     */
    _removeTag: function(e, tagManagerFunc, updateDisplayFunc)
    {
        e.preventDefault();
        e.stopPropagation();
        tagManagerFunc.call(TagManager, e.target.textContent);
        updateDisplayFunc.call(this);
        QuestionsPage.updateQuestionDisplay();
    },

    /**
     * Updates display of ignored tags.
     */
    updateIgnoredTagDisplay: function()
    {
        this._updateTagDisplay(this.ignoredTags,
                               TagManager.ignoredTags,
                               "ignored",
                               this.removeIgnoredTag);
    },

    /**
     * Updates display of interesting tags.
     */
    updateInterestingTagDisplay: function(el, tags)
    {
        this._updateTagDisplay(this.interestingTags,
                               TagManager.interestingTags,
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
 * A question on the Questions page.
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
    hide: function()
    {
        this.element.style.display = "none";
    },

    show: function()
    {
        this.element.style.display = "";
    }
};

/**
 * Handles initialisation of processing and showing/hiding questions based on
 * configuration.
 *
 * @namespace
 */
var QuestionsPage =
{
    /**
     * Kicks off processing of the questions page, performing all necessary
     * setup, including initialising all other components and inserting status
     * display and configuration controls into the page.
     */
    init: function()
    {
        TagManager.init();

        this.questions = [];

        var questionDivs =
            document.evaluate(".//div[@class='question-summary']",
                              document.getElementById("question"),
                              null,
                              XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                              null);

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

        ConfigurationForm.init();
        module.appendChild(ConfigurationForm.form);

        var insertionTarget =
            document.evaluate(".//div[@class='module' and position()=last()]",
                              document.getElementById("sidebar"),
                              null,
                              XPathResult.FIRST_ORDERED_NODE_TYPE,
                              null).singleNodeValue;
        insertionTarget.parentNode.insertBefore(module, insertionTarget);

        this.updateQuestionDisplay();
    },

    /**
     * Updates display of each tag on the page based on the current
     * configuration of ignored and interesting tags.
     */
    updateQuestionDisplay: function()
    {
        var hiddenQuestions = 0;

        for (var i = 0, l = this.questions.length; i < l; i++)
        {
            var question = this.questions[i];
            if (TagManager.questionShouldBeIgnored(question))
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
     * Updates details about the number of hidden questions.
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

QuestionsPage.init();
