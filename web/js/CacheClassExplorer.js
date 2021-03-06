/**
 * Class diagram visualization tool for InterSystems products.
 * @author ZitRo
 * @see http://zitros.tk
 * @param {HTMLElement} treeViewContainer
 * @param {HTMLElement} classViewContainer
 * @constructor
 */
var CacheClassExplorer = function (treeViewContainer, classViewContainer) {

    var id = function (e) { return document.getElementById(e); };

    this.elements = {
        favicon: id("favicon"),
        uiBody: id("ui-body"),
        className: id("className"),
        treeViewContainer: treeViewContainer,
        classViewContainer: classViewContainer,
        zoomInButton: id("button.zoomIn"),
        zoomOutButton: id("button.zoomOut"),
        zoomNormalButton: id("button.zoomNormal"),
        showSettingsButton: id("button.showSettings"),
        helpButton: id("button.showHelp"),
        infoButton: id("button.showInfo"),
        methodCodeView: id("methodCodeView"),
        closeMethodCodeView: id("closeMethodCodeView"),
        methodLabel: id("methodLabel"),
        methodCode: id("methodCode"),
        classView: id("classView"),
        svgContainer: id("svgContainer"),
        methodDescription: id("methodDescription"),
        methodViewBounds: id("methodViewBounds"),
        namespaces: id("namespaces"),
        classTreeSearch: id("classTreeSearch"),
        searchBlock: id("searchBlock"),
        diagramSearch: id("diagramSearch"),
        diagramSearchButton: id("button.diagramSearch"),
        settingsView: id("settingsView"),
        closeSettings: id("closeSettings"),
        helpView: id("helpView"),
        closeHelp: id("closeHelp"),
        settingsExtraText: id("settingsExtraText"),
        settings: {
            showDataTypesOnDiagram: id("setting.showDataTypesOnDiagram"),
            showClassIcons: id("setting.showClassIcons"),
            showPropertyIcons: id("setting.showPropertyIcons"),
            showParameters: id("setting.showParameters"),
            showProperties: id("setting.showProperties"),
            showMethods: id("setting.showMethods"),
            showQueries: id("setting.showQueries")
        }
    };

    var settingsValue = function (name, defaultVal) {
        return localStorage.getItem(name) === null ? (defaultVal || false)
            : localStorage.getItem(name) === "true"
    };

    // note: this.elements is required to be modified with the same name as settings keys
    this.settings = {
        showDataTypesOnDiagram: settingsValue("showDataTypesOnDiagram"),
        showClassIcons: settingsValue("showClassIcons", true),
        showPropertyIcons: settingsValue("showPropertyIcons", true),
        showParameters: settingsValue("showParameters", true),
        showProperties: settingsValue("showProperties", true),
        showMethods: settingsValue("showMethods", true),
        showQueries: settingsValue("showQueries", true)
    };

    this.UI = new UI(this);
    if (treeViewContainer) {
        this.source = new Source(this);
        this.classTree = new ClassTree(this, treeViewContainer);
    }
    this.classView = new ClassView(this, classViewContainer);
    this.NAMESPACE = null;
    this.HELP_INITIALIZED = false;

    if (treeViewContainer) {
        this.initSettings();
        this.init();
    }

};

CacheClassExplorer.prototype.initSettings = function () {

    var self = this,
        textChanged = "Please, re-render diagram to make changes apply.";

    for (var st in this.elements.settings) {
        if (!this.elements.settings[st]) {
            console.warn(st, "is Bred Sivoi Cobyly.");
            continue;
        }
        this.elements.settings[st].checked = this.settings[st];
        this.elements.settings[st].addEventListener("change", (function (st) {
            return function (e) {
                self.elements.settingsExtraText.innerHTML = textChanged;
                localStorage.setItem(
                    st,
                    self.settings[st] = (e.target || e.srcElement).checked
                );
            };
        })(st));
    }

};

/**
 * Render namespaces.
 * @param nsData
 */
CacheClassExplorer.prototype.updateNamespaces = function (nsData) {

    var ns, e;

    this.NAMESPACE = nsData["currentNamespace"];
    this.elements.namespaces.textContent = "";

    for (ns in nsData.namespaces || {}) {
        e = document.createElement("option");
        e.setAttribute("value", ns);
        e.textContent = ns;
        if (ns === nsData.currentNamespace) e.setAttribute("selected", "");
        this.elements.namespaces.appendChild(e);
    }

};

/**
 * @param {string} namespace
 */
CacheClassExplorer.prototype.setNamespace = function (namespace) {

    var self = this;

    this.NAMESPACE = namespace;

    self.classTree.container.textContent = "";
    self.classTree.showLoader();
    this.source.getClassTree(function (err, data) {
        if (!err) self.classTree.updateTree(data);
    });

};

CacheClassExplorer.prototype.updateURL = function () {

    var obj = {
        name: this.classTree.SELECTED_NAME,
        type: this.classTree.SELECTED_TYPE
    };

    if (this.NAMESPACE) obj["namespace"] = this.NAMESPACE;

    location.hash = JSON.stringify(obj);

};

CacheClassExplorer.prototype.restoreFromURL = function () {

    var hash = (location.hash || "").substr(1),
        obj;

    try { obj = JSON.parse(hash); } catch (e) { obj = {}; }

    if (obj.namespace) this.NAMESPACE = obj.namespace;
    if (obj.type === "class") {
        this.classView.loadClass(obj.name);
    } else if (obj.type === "package") {
        this.classView.loadPackage(obj.name);
    } else {
        this.classView.renderInfoGraphic();
    }

    return obj;

};

CacheClassExplorer.prototype.initHelp = function () {

    if (this.HELP_INITIALIZED) return;
    this.HELP_INITIALIZED = true;

    var cont = [].slice.call(document.querySelectorAll("#helpView *[name=injector]")),
    cont2 = [].slice.call(document.querySelectorAll("#helpView *[name=icon]")), i;
    for (i in cont) {
        var ue, json = {
            classes: { "Unable to parse JSON": {  } }
        };
        try { json = JSON.parse(cont[i].textContent) } catch (e) {  }
        cont[i].textContent = "";
        ue = new CacheClassExplorer(null, cont[i]);
        ue.classView.injectView(json);
    }
    for (i in cont2) {
        var ico = lib.image[cont2[i].textContent];
        if (ico) {
            cont2[i].innerHTML = "<img src=\"" + ico + "\"/>"
        }
    }

};

CacheClassExplorer.prototype.init = function () {

    var self = this,
        restored;

    this.elements.favicon.href = lib.image.binoculars;

    restored = this.restoreFromURL();
    this.classTree.showLoader();
    this.source.getClassTree(function (err, data) {
        if (!err) self.classTree.updateTree(data);
    });
    this.source.getNamespacesInfo(function (err, data) {
        if (restored && restored.namespace) data.currentNamespace = restored.namespace;
        if (!err) self.updateNamespaces(data);
    });

    this.elements.infoButton.addEventListener("click", function () {
        self.UI.displayMessage(
            "Cach&eacute; Class explorer v"
            + "[NOT-BUILT]"/*build.replace:"pkg.version"*/
            + "<br/>for InterSystems Cach&eacute;"
            + "<br/>By Nikita Savchenko"
            + "<br/><a target=\"_blank\" href=\"https://github.com/intersystems-ru/UMLExplorer\">"
            + "Project page</a> / <a target=\"_blank\" "
            + "href=\"https://github.com/intersystems-ru/UMLExplorer/issues\">Bug tracker</a>"
            + "<br/><br/>Enjoy!"
        );
    });
    this.elements.namespaces.addEventListener("change", function (e) {
        var el = e.target || e.srcElement,
            ns = el.options[el.selectedIndex].value;
        if (ns !== self.NAMESPACE) {
            self.setNamespace(ns);
        }
    });
    this.elements.helpButton.addEventListener("click", function () {
        self.initHelp();
        self.elements.helpView.classList.add("active");
    });
    this.elements.closeHelp.addEventListener("click", function () {
        self.elements.helpView.classList.remove("active");
    });
    this.elements.showSettingsButton.addEventListener("click", function () {
        self.elements.settingsView.classList.add("active");
    });
    this.elements.closeSettings.addEventListener("click", function () {
        self.elements.settingsExtraText.textContent = "";
        self.elements.settingsView.classList.remove("active");
    });

    enableSVGDownload(this.classTree);

};