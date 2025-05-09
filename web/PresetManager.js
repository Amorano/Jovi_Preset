/**/

import { app } from "../../scripts/app.js";

class UIPresetManager {
    constructor(node) {
        this.node = node;
        // Store presets configuration
        this.presets = {
            default : {}
        };

        // everyone has a default...
        if (node.widgets) {
            for (const widget of Object.values(node.widgets)) {
                this.presets.default[widget.name] = widget.value;
            }
        }
    }

    apply(name) {
        const preset = this.presets?.[name];
        if (preset) {
            for (const [key, value] of Object.entries(preset)) {
                const widget = this.node.widgets.find(w => w.name == key);
                if (widget) {
                    widget.value = value;
                }
            }
            this.node.setDirtyCanvas(!0, !1);
            app.graph.setDirtyCanvas(!0, !1);
        }
    }
}

app.registerExtension({
    name: "jov.uiPresetManager",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            const me = onNodeCreated?.apply(this);
            if (!this.widgets) {
                return me;
            }
            this.presetManager = new UIPresetManager(this, nodeData);
            return me;
        };

        const getExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
        nodeType.prototype.getExtraMenuOptions = function (_, options) {
            const me = getExtraMenuOptions?.apply(this, arguments);
            if (this.widgets) {
                const presetList = [];
                for (const presetName of Object.keys(this.presetManager.presets)) {
                    const presetObject = {
                        content: `${presetName}`,
                        callback: () => this.presetManager.apply(presetName)
                    };
                    presetList.push(presetObject);
                }
                options.push({
                    content: "Presets",
                    submenu: {
                        options: presetList
                    }
                })
            }
            return me;
        };
    }
});