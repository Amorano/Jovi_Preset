/**/

import { app } from "../../scripts/app.js";
import { $el } from "../../scripts/ui.js";

let PANEL;
const SETTINGS = "jovi.preset";
const EVENT_UPDATE = "jovi.preset-save"
const PRESET = app.extensionManager.setting.get(SETTINGS) || {};

class PresetManager {
    constructor(node) {
        this.node = node;
        const defaults = {};
        for (const widget of Object.values(this.node.widgets)) {
            if (widget.options?.default) {
                defaults[widget.name] = widget.options.default;
            } else if (widget.options?.values) {
                defaults[widget.name] = widget.options.values[0];
            } else if (widget?.value) {
                defaults[widget.name] = widget.value;
            }
        }
        this.presets = {
            ...{"default": defaults},
            ...(PRESET[this.node.title] || {})
        };
        this.content = null;
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

    event_update(preset, detail) {
        // 🔊 Dispatch custom global event
        window.dispatchEvent(new CustomEvent(EVENT_UPDATE, {
            detail: {
                presetName: preset,
            }
        }));

        app.extensionManager.toast.add({
            severity: "success",
            summary: "Success",
            detail: detail,
            life: 3000
        });
    }

    del(name) {
        if (name === "default") {
            throw new Error("Cannot delete 'default' preset");
        }
        delete this.presets[name];
        //PRESET[this.node.title] = this.presets;
        PRESET[this.node.title] = structuredClone(this.presets);
        delete PRESET[this.node.title]["default"];
        app.extensionManager.setting.set(SETTINGS, PRESET);
        this.event_update(name, `Preset ${name} removed`);
    }

    save(name) {
        name = name.toLowerCase();
        if (name === "default") {
            throw new Error("Cannot overwrite 'default' preset");
        }

        this.presets[name] = {}
        for (const widget of Object.values(this.node.widgets)) {
            this.presets[name][widget.name] = widget.value;
        }

        //PRESET[this.node.title] = this.presets;
        PRESET[this.node.title] = structuredClone(this.presets);
        delete PRESET[this.node.title]["default"];
        app.extensionManager.setting.set(SETTINGS, PRESET);
        this.event_update(name, `Preset ${name} saved`);
    }
}

class PresetManagerPanel {
    constructor(el) {
        this.content = null;
        this.tbody = null;
        this.el = el;

        this.contextMenu = $el("div", {
            class: "jov-preset-contextmenu"
        }, [
            $el("div", { class: "menu-item", 'data-action': "rename" }, [document.createTextNode("Rename")]),
            $el("div", { class: "menu-item", 'data-action': "delete" }, [document.createTextNode("Delete")])
        ]);
        document.body.appendChild(this.contextMenu);

        document.addEventListener("click", () => {
            this.contextMenu.style.display = "none";
        });

        window.addEventListener(EVENT_UPDATE, (e) => {
            this.panel();
        });
    }

    showContextMenu(x, y, presetName, groupName) {
        const menu = this.contextMenu;
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.display = "block";
        console.log("Showing context menu at", x, y); // Add this

        menu.onclick = (e) => {
            const action = e.target.getAttribute("data-action");
            if (!action) return;

            if (action === "rename") {
                const newName = prompt("Rename preset:", presetName);
                if (newName && newName !== presetName) {
                    PRESET[groupName][newName] = PRESET[groupName][presetName];
                    delete PRESET[groupName][presetName];
                    alert(`Renamed "${presetName}" to "${newName}"`);
                    location.reload();
                }
            }

            if (action === "delete") {
                if (confirm(`Delete preset "${presetName}"?`)) {
                    delete PRESET[groupName][presetName];
                    alert(`Deleted "${presetName}"`);
                    location.reload();
                }
            }

            menu.style.display = "none";
        };
    }

    multilineTooltip(obj) {
        return Object.entries(obj)
            .map(([key, val]) => {
                if (Array.isArray(val)) {
                    return `${key}: [${val.join(", ")}]`;
                } else if (typeof val === "object" && val !== null) {
                    return `${key}: {...}`;
                } else if (typeof val === "string") {
                    return `${key}: "${val}"`;
                } else {
                    return `${key}: ${val}`;
                }
            }).join("\n");
    }

    panel_search_filter(filter) {
        const searchLower = filter.toLowerCase();
        const rows = this.tbody.querySelectorAll('tr');

        rows.forEach(row => {
            const nameCell = row.querySelector('td:last-child');
            if (!nameCell) return;

            const text = nameCell.textContent.toLowerCase();
            const categoryMatch = row.classList.contains('jov-panel-color-cat_major') ||
                                row.classList.contains('jov-panel-color-cat_minor');

            // Show categories if they or their children match
            if (categoryMatch) {
                const siblingRows = this.getNextSiblingRowsUntilCategory(row);
                const hasVisibleChildren = siblingRows.some(sibling => {
                    const siblingText = sibling.querySelector('td:last-child')?.textContent.toLowerCase() || '';
                    return siblingText.includes(searchLower);
                });

                row.style.display = hasVisibleChildren || text.includes(searchLower) ? '' : 'none';
            } else {
                row.style.display = text.includes(searchLower) ? '' : 'none';
            }
        });
    }

    panel() {
        this.tbody = $el("tbody");
        for (const [groupName, all_presets] of Object.entries(PRESET)) {
            // Row for each preset inside the group
            const node_presets = Object.entries(all_presets);
            if (node_presets.length == 0) {
                continue;
            }

            // Header row for the group (e.g., "BLUR (JOV)")
            const headerRow = $el("tr", {}, [
                $el("th", { colspan: 1 }, [document.createTextNode(groupName)])
            ]);
            this.tbody.appendChild(headerRow);
            for (const [presetName, entries] of Object.values(node_presets)) {
                if (presetName == "default") {
                    continue;
                }
                const tooltip = this.multilineTooltip(entries);
                const cell = $el("td", {
                    title: tooltip,
                }, [
                    document.createTextNode(presetName)
                ]);
                const row = $el("tr", {}, [cell]);
                row.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showContextMenu(e.pageX, e.pageY, presetName, groupName);
                });
                this.tbody.appendChild(row);
            }
        }

        const panel = $el("div.jov-preset", [
            $el("div.jov-preset-header", [
                $el("div", { textContent: "PRESET MANAGER" })
            ]),
            $el("input", {
                type: "text",
                placeholder: "Filter presets...",
                className: "jov-preset-search-input",
                oninput: (e) => this.panel_search_filter(e.target.value)
            }),
            $el("div.jov-preset-main", [
                $el("table.flexible-table", [
                    this.tbody
                ])
            ])
        ]);

        while (this.el.firstChild) {
            this.el.removeChild(this.el.firstChild);
        }
        this.el.appendChild(panel);
    }
}

app.extensionManager.registerSidebarTab({
    id: "jov_preset.sidebar",
    icon: "pi pi-sliders-h",
    title: "Joviex Preset Manager",
    tooltip: "Presets for ComfyUI Nodes",
    type: "custom",
    render: async (el) => {
        if (typeof PANEL === "undefined" || !PANEL) {
            PANEL = new PresetManagerPanel(el);
        }
        const panel = PANEL.panel();
    }
});

app.registerExtension({
    name: "jovi.preset",
    settings: [{
        id: SETTINGS,
        name: "Presets for nodes",
        type: "hidden",
        defaultValue: {}
    }],
    async init() {
        const styleTagId = 'jovi_preset-stylesheet';
        let styleTag = document.getElementById(styleTagId);
        if (styleTag) {
            return;
        }

        document.head.appendChild(Object.assign(document.createElement('link'), {
            id: styleTagId,
            rel: 'stylesheet',
            type: 'text/css',
            href: 'extensions/jovi_preset/jovi_preset.css'
        }));
	},
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
                    app.extensionManager.dialog.prompt({
                        title: "User Input",
                        message: "Please enter your name:",
                        defaultValue: "User"
                    }).then(result => {
                        if (result !== null) {
                            if (/^[A-Za-z\s]+$/.test(result)) {
                                try {
                                    this.presetManager.save(result);
                                } catch(e) {
                                    app.extensionManager.toast.add({
                                        severity: "error",
                                        summary: "Error",
                                        detail: `Failed to save preset ${e} request`,
                                        life: 5000
                                    });
                                }
                            } else {
                                app.extensionManager.toast.add({
                                    severity: "warn",
                                    summary: "Warning",
                                    detail: `Invalid preset name {result}. Only A-Z and space are valid.`,
                                    life: 5000
                                });
                            }
                        }
                    });
                }
            }];

            if (this.presetManager === undefined) {
                return me;
            }
            for (const presetName of Object.keys(this.presetManager.presets)) {
                const presetObject = {
                    content: presetName,
                    callback: async (a, _, click) => {
                        try {
                            if (click.ctrlKey) {
                                this.presetManager.del(presetName);
                            } else {
                                this.presetManager.apply(presetName);
                            }
                        } catch(e) {
                            app.extensionManager.toast.add({
                                severity: "error",
                                summary: "Error",
                                detail: `Failed to delete preset ${presetName}:\n${e}`,
                                life: 5000
                            });
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