// TODO: measure performance
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Main = imports.ui.main;

const {
    getGPUTemperatureCommand,
    getCPUTemperatureCommand,
    updateAll,
    updateCPU,
    logError,
} = Me.imports.utils;

const { St, GLib } = imports.gi;

let gpuPanel, cpuPanel, gpuPanelText, cpuPanelText;

var init = () => {
    gpuPanel = new St.Bin({
        style_class: "panel-button",
    });
    gpuPanelText = new St.Label({
        style_class: "label",
    });
    gpuPanel.set_child(gpuPanelText);

    cpuPanel = new St.Bin({
        style_class: "panel-button",
    });
    cpuPanelText = new St.Label({
        style_class: "label",
    });
    cpuPanel.set_child(cpuPanelText);
};

var enable = async () => {
    const priority = GLib.PRIORITY_LOW;
    const updateInterval = 2.0;

    try {
        let gpuCommand = await getGPUTemperatureCommand();
        let cpuCommand = await getCPUTemperatureCommand();

        if (gpuCommand && cpuCommand) {
            GLib.timeout_add_seconds(
                priority,
                updateInterval,
                updateAll.bind(
                    this,
                    cpuCommand,
                    cpuPanelText,
                    gpuCommand,
                    gpuPanelText
                )
            );
        } else if (gpuCommand) {
            GLib.timeout_add_seconds(
                priority,
                updateInterval,
                updateGPU.bind(this, gpuCommand, gpuPanelText)
            );
        } else if (cpuCommand) {
            GLib.timeout_add_seconds(
                priority,
                updateInterval,
                updateCPU.bind(this, cpuCommand, cpuPanelText)
            );
        }
        Main.panel._rightBox.insert_child_at_index(gpuPanel, 0);
        Main.panel._rightBox.insert_child_at_index(cpuPanel, 0);
    } catch (e) {
        logError(e);
    }
};

var disable = () => {
    Main.panel._rightBox.remove_child(gpuPanel);
    Main.panel._rightBox.remove_child(cpuPanel);
};
