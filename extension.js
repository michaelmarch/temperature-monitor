// TODO: measure performance
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Main = imports.ui.main;

const { St, GLib } = imports.gi;
const { detectGPU, updateCPU, updateAll } = Me.imports.utils;
const { GPU_NONE, GPU_AMD, GPU_NVIDIA, CPU } = Me.imports.constants;

const Commands = {
    [GPU_NONE]: "",
    [GPU_AMD]: "",
    [GPU_NVIDIA]: ["nvidia-settings", "-q", "gpucoretemp", "-t"],
    [CPU]: "/sys/class/thermal/thermal_zone0/temp",
};

let gpuPanel, cpuPanel, gpuPanelText, cpuPanelText, GPU;

function init() {
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
}

async function enable() {
    GPU = await detectGPU(); // TODO: test the view without gpu monitor
    Main.panel._rightBox.insert_child_at_index(gpuPanel, 0);
    Main.panel._rightBox.insert_child_at_index(cpuPanel, 0);

    try {
        GLib.timeout_add_seconds(
            0,
            1.0,
            GPU === GPU_NONE
                ? updateCPU.bind(this, Commands[CPU], cpuPanelText)
                : updateAll.bind(
                      this,
                      Commands[CPU],
                      cpuPanelText,
                      Commands[GPU],
                      gpuPanelText
                  )
        );
    } catch (e) {
        logError(e);
    }
}

function disable() {
    Main.panel._rightBox.remove_child(gpuPanel);
    Main.panel._rightBox.remove_child(cpuPanel);
}
