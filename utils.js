const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { Gio, GLib } = imports.gi;

//* Note: Only functions declared with 'var' keyword are automatically exported

/**
 *  Finds the command for fetching temperature of a GPU.
 ** Note: In a case of multiple GPUs installed in the system the first GPU listed by `lspci` will be used.
 *
 *  @returns {string[] | undefined} The command split with ' ' (white space), which an be directly passed to {@link execCommunicate}
 *                                  or `undefined` if GPU couldn't be detected.
 */
var getGPUTemperatureCommand = async () => {
    try {
        const output = await execCommunicate(["lspci", "-nnk"]);
        const lines = output.split("\n");

        for (let line of lines) {
            line = line.toLowerCase();

            if (!line.includes("vga") && !line.includes("3d")) {
                continue;
            }

            if (line.includes("nvidia")) {
                return ["nvidia-settings", "-q", "gpucoretemp", "-t"];
            } else if (line.includes("amd") || line.includes("radeon")) {
                //return [""];
            }
        }
    } catch (e) {
        logError(e);
    }
};

/**
 * Finds the command for fetching temperature of a CPU.
 *
 * @returns {string[] | undefined} The command split with ' ' (white space), which an be directly passed to {@link execCommunicate}
 *                                 or `undefined` if GPU couldn't be detected.
 */
var getCPUTemperatureCommand = async () => {
    try {
        let thermalZones = (await execCommunicate(["ls", "/sys/class/thermal"]))
            .split("\n")
            .filter((e) => e.includes("thermal_zone"));

        let pkgThermalZone = await findAsync(
            thermalZones,
            async (thermalZone) => {
                let thermalZoneType = await execCommunicate([
                    "cat",
                    `/sys/class/thermal/${thermalZone}/type`,
                ]);
                return thermalZoneType === "x86_pkg_temp";
            }
        );

        return ["cat", `/sys/class/thermal/${pkgThermalZone}/temp`];
    } catch (e) {
        logError(e);
    }
};

/**
 * Callback function for updating all monitors.
 * 
 * @param {string[]} cpuCommand - A command for fetching the CPU temperature obtained from {@link getCPUTemperatureCommand}
 * @param {St.Label} cpuLabel 
 * @param {string[]} gpuCommand - A command for fetching the GPU temperature obtained from {@link getGPUTemperatureCommand}
 * @param {St.Label} gpuLabel 
 * 
 * @returns {boolean} Either `GLib.SOURCE_REMOVE` or `GLib.SOURCE_CONTINUE`
 */
var updateAll = async (cpuCommand, cpuLabel, gpuCommand, gpuLabel) => {
    return (
        (await updateCPU(cpuCommand, cpuLabel)) &&
        (await updateGPU(gpuCommand, gpuLabel))
    );
};

/**
 * Callback function for updating CPU monitors.
 * 
 * @param {string[]} command - A command for fetching the CPU temperature obtained from {@link getCPUTemperatureCommand}
 * @param {St.Label} label 
 * 
 * @returns {boolean} Either `GLib.SOURCE_REMOVE` or `GLib.SOURCE_CONTINUE`
 */
var updateCPU = async (command, label) => {
    try {
        let output = (await execCommunicate(command)) / 1000;
        label.set_text(`C: ${output} °C`);
    } catch (e) {
        logError(e);
        return GLib.SOURCE_REMOVE;
    }

    return GLib.SOURCE_CONTINUE;
};

/**
 * Callback function for updating GPU monitors.
 * 
 * @param {string[]} command - A command for fetching the GPU temperature obtained from {@link getGPUTemperatureCommand}
 * @param {St.Label} label 
 * 
 * @returns {boolean} Either `GLib.SOURCE_REMOVE` or `GLib.SOURCE_CONTINUE`
 */
var updateGPU = async (command, label) => {
    try {
        let output = (await execCommunicate(command));
        label.set_text(`G: ${output} °C`);
    } catch (e) {
        logError(e);
        return GLib.SOURCE_REMOVE;
    }

    return GLib.SOURCE_CONTINUE;
};

/**
 * Logs the error. To check for errors use: `journalctl -f -o cat /usr/bin/gnome-shell`
 * 
 * @param {Error} error
 */
var logError = (error) => {
    log("***************** CAUGHT EXCEPTION *****************");
    global.logError(error);
    log(error.stack);
};

/**
 * 
 * @param {string[]} argv A command split by ' ' (white space)
 * 
 * @returns {Promise<string>} - Standard output of the supplied command if successful
 */
let execCommunicate = (argv) => {
    try {
        let flags =
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE;

        let proc = Gio.Subprocess.new(argv, flags);

        return new Promise((resolve, reject) => {
            proc.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    let [, stdout, stderr] = proc.communicate_utf8_finish(res);

                    if (proc.get_successful()) {
                        resolve(stdout.trim());
                    }

                    let status = proc.get_exit_status();
                    throw new Gio.IOErrorEnum({
                        code: Gio.io_error_from_errno(status),
                        message: stderr ? stderr.trim() : GLib.strerror(status),
                    });
                } catch (e) {
                    reject(e);
                }
            });
        });
    } catch (e) {
        logError(e);
    }
};

/**
 * Asynchronous implementation of {@link Array.find}: https://stackoverflow.com/a/55601090
 * 
 * @template T
 * @param {T[]} array 
 * @param {(e: T) => boolean} asyncCallback 
 * 
 * @returns {Promise<T | undefined>} 
 */
let findAsync = async (array, asyncCallback) => {
    const promises = array.map(asyncCallback);
    const results = await Promise.all(promises);
    const index = results.findIndex((result) => result);
    return array[index];
};
