(function randomSaddleBeatsDrift() {
    app.beginUndoGroup("Random Saddle Camera Movements with Drift");

    try {
        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) {
            alert("Please select or open a composition.");
            return;
        }

        var dialog = new Window("dialog", "Camera Movement Settings", undefined);
        dialog.orientation = "column";
        dialog.alignChildren = ["fill", "fill"];
        dialog.spacing = 10;
        dialog.margins = 16;

        var bpmGroup = dialog.add("group");
        bpmGroup.add("statictext", undefined, "BPM (beats per minute):");
        var bpmInput = bpmGroup.add("edittext", undefined, "120");
        bpmInput.characters = 10;

        var startFrameGroup = dialog.add("group");
        startFrameGroup.add("statictext", undefined, "Start Frame:");
        var startFrameInput = startFrameGroup.add("edittext", undefined, "0");
        startFrameInput.characters = 10;

        var beatsGroup = dialog.add("group");
        beatsGroup.add("statictext", undefined, "Number of Beats:");
        var beatsInput = beatsGroup.add("edittext", undefined, "32");
        beatsInput.characters = 10;

        var durationGroup = dialog.add("group");
        durationGroup.add("statictext", undefined, "Transition Duration (frames):");
        var durationInput = durationGroup.add("edittext", undefined, "10");
        durationInput.characters = 10;

        var amplitudeGroup = dialog.add("group");
        amplitudeGroup.add("statictext", undefined, "Amplitude (pixels):");
        var amplitudeInput = amplitudeGroup.add("edittext", undefined, "2000");
        amplitudeInput.characters = 10;

        var baseRangeGroup = dialog.add("group");
        baseRangeGroup.add("statictext", undefined, "Base Drift Range (pixels):");
        var baseRangeInput = baseRangeGroup.add("edittext", undefined, "0");
        baseRangeInput.characters = 10;

        var buttonGroup = dialog.add("group");
        buttonGroup.alignment = ["fill", ""];
        var okButton = buttonGroup.add("button", undefined, "OK", {name: "ok"});
        var cancelButton = buttonGroup.add("button", undefined, "Cancel", {name: "cancel"});

        var inputs = {};
        okButton.onClick = function() {
            inputs.bpm = Number(bpmInput.text);
            inputs.startFrame = Number(startFrameInput.text);
            inputs.beats = Number(beatsInput.text);
            inputs.durationFrames = Number(durationInput.text);
            inputs.amplitude = Number(amplitudeInput.text);
            inputs.baseRange = Number(baseRangeInput.text);
            dialog.close(1);
        };
        cancelButton.onClick = function() { dialog.close(0); };

        if (dialog.show() !== 1) {
            app.endUndoGroup();
            return;
        }

        for (var key in inputs) {
            if (isNaN(inputs[key])) {
                alert("Invalid input for " + key + ". Please enter numeric values.");
                return;
            }
        }

        if (inputs.bpm <= 0) { alert("BPM must be > 0"); return; }
        if (inputs.beats <= 0) { alert("Number of beats must be > 0"); return; }
        if (inputs.durationFrames <= 0) { alert("Transition duration must be > 0"); return; }

        var fps = comp.frameRate;
        var startTime = inputs.startFrame / fps;
        var durSec = inputs.durationFrames / fps;
        var endTime = startTime + (inputs.beats * (60 / inputs.bpm));

        var cam = null;
        /*         
        for (var i = 1; i <= comp.layers.length; i++) {
            if (comp.layers[i] instanceof CameraLayer) {
                cam = comp.layers[i];
                break;
            }
        } */
        if (!cam) {
            cam = comp.layers.addCamera("Auto Camera BeatSync", [comp.width/2, comp.height/2]);
            cam.moveToBeginning();
        }

        var posProp = cam.property("Transform").property("Position");
        var basePosArray = posProp.valueAtTime(startTime, false);
        if (!basePosArray || basePosArray.length < 3) {
            basePosArray = [comp.width/2, comp.height/2, -1000];
        }

        function fmt(n) { return (Number(n)).toFixed(3); }
        var baseVec = [fmt(basePosArray[0]), fmt(basePosArray[1]), fmt(basePosArray[2])];

        // Expression for position
        var expr =
            "/* Random saddle + drifting base with beat limit */\n" +
            "var bpm = " + inputs.bpm + ";\n" +
            "var beatInterval = 60 / bpm;\n" +
            "var startTime = " + fmt(startTime) + ";\n" +
            "var endTime = " + fmt(endTime) + ";\n" +
            "var dur = " + fmt(durSec) + ";\n" +
            "var amp = " + fmt(inputs.amplitude) + ";\n" +
            "var baseRange = " + fmt(inputs.baseRange) + ";\n" +
            "var initBase = [960, 540 , " + baseVec[2] + "];\n" +
            "\n" +
            "if (time < startTime || time >= endTime) {\n" +
            "  initBase;\n" +
            "} else {\n" +
            "  var t = time - startTime;\n" +
            "  var beat = Math.floor(t / beatInterval);\n" +
            "  var beatTime = startTime + beat * beatInterval;\n" +
            "\n" +
            "  // Pick a random drifted base for this beat\n" +
            "  seedRandom(beat+100, true);\n" +
            "  var drift = [random(-baseRange, baseRange), random(-baseRange, baseRange), random(-baseRange, baseRange)];\n" +
            "  var base = initBase + drift;\n" +
            "\n" +
            "  if (time >= beatTime && time < beatTime + dur) {\n" +
            "    seedRandom(beat, true);\n" +
            "    var dir = [random(-1,1), random(-1,1), random(-0.5,0.5)];\n" +
            "    var easeT = ease(time, beatTime, beatTime+dur, 0, 1);\n" +
            "    base + dir * amp * Math.sin(easeT * Math.PI);\n" +
            "  } else {\n" +
            "    base;\n" +
            "  }\n" +
            "}\n";

        posProp.expression = expr;

        alert("Done — expression applied with drifting base.\n" +
              "BPM: " + inputs.bpm + " | Start Frame: " + inputs.startFrame +
              " | Beats: " + inputs.beats + " | Duration (frames): " + inputs.durationFrames +
              " | Amplitude: " + inputs.amplitude + " | Base Range: " + inputs.baseRange);

    } catch (err) {
        alert("Error: " + err.toString());
    } finally {
        app.endUndoGroup();
    }
})();
