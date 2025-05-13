/**/

import { app } from "../../scripts/app.js";

const SETTINGS = "jovi.preset";
const PRESET = app.extensionManager.setting.get(SETTINGS) || {};

class PresetManager {
    constructor(node) {
        this.node = node;
        this.presets = PRESET[this.node.title] || {};
    }

    apply(name) {
        if (name === "default") {
            for (const widget of Object.values(this.node.widgets)) {
                widget.value = widget.options?.default;
            }
            return;
        }

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

    async del(name) {
        if (name === "default") {
            throw new Error("Cannot delete 'default' preset");
        }
        delete this.presets[name];
        PRESET[this.node.title] = this.presets;
        if (Object.keys(PRESET[this.node.title] || {}).length === 0) {
            delete PRESET[this.node.title];
        }
        await app.extensionManager.setting.set(SETTINGS, PRESET);
    }

    async save(name) {
        name = name.toLowerCase();
        if (name === "default") {
            throw new Error("Cannot overwrite 'default' preset");
        }

        this.presets[name] = {}
        for (const widget of Object.values(this.node.widgets)) {
            this.presets[name][widget.name] = widget.value;
        }

        PRESET[this.node.title] = this.presets;
        await app.extensionManager.setting.set(SETTINGS, PRESET);
    }
}

app.registerExtension({
    name: "jovi.preset",
    settings: [{
        id: SETTINGS,
        name: "Presets for nodes",
        type: "hidden",
        defaultValue: {}
    }],
    async beforeRegisterNodeDef(nodeType, nodeData) {
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            const me = onNodeCreated?.apply(this);
            if (!this.widgets) {
                return me;
            }
            this.presetManager = new PresetManager(this, nodeData);
            return me;
        };

        const getExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
        nodeType.prototype.getExtraMenuOptions = function (canvas, options) {
            const me = getExtraMenuOptions?.apply(this, arguments);
            if (this.widgets === undefined || this.widgets.length == 0) {
                return me;
            }

            const presetList = [{
                content: "Save Preset...",
                callback: () => {
                    const prompt = canvas.prompt("Save Preset", "", async function(v) {
                        if (/^[A-Za-z\s]+$/.test(v)) {
                            try {
                                await this.presetManager.save(v);
                            } catch(e) {
                                throw new Error(e);
                            }
                        }
                    }.bind(this));
                    if (prompt && prompt.style) {
                        prompt.style.position = "fixed";
                        prompt.style.left = `${canvas.last_mouse[0]}px`;
                        prompt.style.top = `${canvas.last_mouse[1]}px`;
                    }
                }
            }];

            for (const presetName of Object.keys(this.presetManager.presets)) {
                const presetObject = {
                    content: presetName,
                    callback: async (a, _, click) => {
                        if (click.ctrlKey) {
                            await this.presetManager.del(presetName);
                        } else {
                            this.presetManager.apply(presetName);
                        }
                    }
                };
                presetList.push(presetObject);
            }
            options.push({
                content: "Presets",
                submenu: {
                    options: presetList
                }
            })
            return me;
        }
    }
});