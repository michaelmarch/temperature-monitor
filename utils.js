const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { GPU_NONE, GPU_AMD, GPU_NVIDIA } = Me.imports.constants;
const { Gio, GLib } = imports.gi;

const decoder = new TextDecoder("ascii");

var detectGPU = async () => {
    try {
        let output = await execCommunicate(["lspci", "-nnk"]);
        let lines = output.split("\n");

        for (let line of lines) {
            line = line.toLowerCase();

            if (!line.includes("vga") && !line.includes("3d")) {
                continue;
            }

            if (line.includes("nvidia")) {
                return GPU_NVIDIA;
            } else if (line.includes("amd") || line.includes("radeon")) {
                return GPU_AMD;
            }
        }
    } catch (e) {
        logError(e);
    }

    return GPU_NONE;
};

var updateAll = async (cpuCommand, cpuLabel, gpuCommand, gpuLabel) => {
    try {
        let output = await execCommunicate(gpuCommand);
        gpuLabel.set_text(`G: ${output} °C`);

        let [, output2] = await readFile(cpuCommand);
        output2 = parseInt(decoder.decode(output2) / 1000);
        cpuLabel.set_text(`C: ${output2} °C`);
    } catch (e) {
        logError(e);
        return GLib.SOURCE_REMOVE;
    }
   
    return GLib.SOURCE_CONTINUE;
};

var updateCPU = async (command, label) => {
    try {
        let [, output] = await readFile(command);
        output = parseInt(decoder.decode(output) / 1000);
        label.set_text(`C: ${output} °C`);
    } catch (e) {
        logError(e);
        return GLib.SOURCE_REMOVE;
    }
   
    return GLib.SOURCE_CONTINUE;
};

var logError = (e) => {
    log("***************** CAUGHT EXCEPTION *****************");
    global.logError(e);
    log(`${e.stack}`);
};

var execCommunicate = (argv) => {
    try {
        let flags =
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE;

        let proc = Gio.Subprocess.new(argv, flags);

        return new Promise((resolve, reject) => {
            proc.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    let [, stdout, stderr] = proc.communicate_utf8_finish(res);

                    if (!proc.get_successful()) {
                        let status = proc.get_exit_status();
                        throw new Gio.IOErrorEnum({
                            code: Gio.io_error_from_errno(status),
                            message: stderr
                                ? stderr.trim()
                                : GLib.strerror(status),
                        });
                    }

                    resolve(stdout.trim());
                } catch (e) {
                    reject(e);
                }
            });
        });
    } catch (e) {
        logError(e);
    }
};

var readFile = (path) => {
    const file = Gio.File.new_for_path(path);

    return new Promise((resolve, reject) => {
        file.load_contents_async(null, (_file, result) => {
            try {
                resolve(file.load_contents_finish(result));
            } catch (e) {
                reject(e);
            }
        });
    });
};
