import WebMidi from "webmidi";

export var output: any = undefined;
var useMidi: boolean = false;

export function initMidi() {
    if (useMidi) {
        WebMidi.enable((err: any) => {
            if (err) {
                console.log("WebMidi could not be enabled.", err);
            } else {
                output = WebMidi.outputs[0];
                console.log("Found output: ", output.name);
            }
        });
        //WebMidi.disable()
    } else {
    }
}

export async function stopNote(note: number) {
    return;
    if (useMidi) {
        output.stopNote(note)
    } else {
        await pipeMidi({
            midiport: 'IAC Driver Bus 1',
            midicommand: 'noteoff',
            channel: 1,
            note: note,
            velocity: 1
        });
    }
}


export async function playNote(note: number) {
    if (useMidi) {
        output.playNote(note);
    } else {
        return pipeMidi({
            midiport: 'IAC Driver Bus 2',
            midicommand: 'noteon',
            channel: 1,
            note: note
        }).then(_ => pipeMidi({
            midiport: 'IAC Driver Bus 2',
            midicommand: 'noteoff',
            channel: 1,
            note: note
        }));
    }
}

async function pipeMidi(data: any) {
    await fetch("http://192.168.1.25:4000/sendmidi", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
}

