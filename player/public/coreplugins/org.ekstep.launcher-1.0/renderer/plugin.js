/**
 * Plugin to create repo instance and to register repo instance
 * @extends EkstepRenderer.Plugin
 * @author Manjunath Davanam <manjunathd@ilimi.in>
 */
Plugin.extend({
    templatePath : undefined,
    controllerPath:undefined,
    _ngScopeVar: "playerContent",
    _injectTemplateFn: undefined,
    initialize: function() {
        console.info('Launcher plugin intialize is doing..');
        EkstepRendererAPI.addEventListener('renderer:launcher:load',this.start,this);
        this.templatePath = EkstepRendererAPI.resolvePluginResource(this._manifest.id, this._manifest.ver, "renderer/templates/renderer.html");
        this.controllerPath = EkstepRendererAPI.resolvePluginResource(this._manifest.id, this._manifest.ver, "renderer/js/rendererApp.js");
        var instance = this;
        org.ekstep.service.controller.loadNgModules(this.templatePath, this.controllerPath);
    },
    start: function(evt, content) {
        console.info('launcher init is calling..');
        var contentTypePlugin = _.findWhere(AppConfig.CONTENT_LAUNCHERS, {
            'mimeType': content.mimeType
        });
        isCoreplugin = true;
        org.ekstep.contentrenderer.initPlugins('');
        if (!_.isUndefined(contentTypePlugin)) {
            this.loadPlugin(contentTypePlugin, content);
            isCoreplugin = false;
        }
    },
    loadPlugin: function(plugin, content) {
        var instance = this;
        org.ekstep.contentrenderer.loadPlugins(plugin, [], function() {
            instance.initTelemetry(content);
            console.log('LAUNCHER - content:load:' + content.mimeType)
            EkstepRendererAPI.dispatchEvent('renderer:collection:hide');
            EkstepRendererAPI.dispatchEvent('content:load:' + content.mimeType, undefined, content);
        });
    },
    initTelemetry:function(content){
        EkstepRendererAPI.dispatchEvent('renderer:telemetry:start',undefined,content);
    }   

})
//# sourceURL=ContentLauncher.js