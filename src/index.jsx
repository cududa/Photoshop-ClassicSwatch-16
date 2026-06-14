import React from "react";

import "./styles.css";
import { PanelController } from "./controllers/PanelController.jsx";
import { ClassicSwatches } from "./panels/ClassicSwatches.jsx";

import { entrypoints } from "uxp";

const swatchesController =  new PanelController(() => <ClassicSwatches/>, { id: "cSwatchesPanel", menuItems: [
    { id: "reload", label: "Reload Plugin", enabled: true, checked: false, oninvoke: () => location.reload() },
] });

entrypoints.setup({
    plugin: {
        create(plugin) {
            /* optional */ console.log("created", plugin);
        },
        destroy() {
            /* optional */ console.log("destroyed");
        }
    },
    panels: {
        cSwatchesPanel: swatchesController
    }
});
