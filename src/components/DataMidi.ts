//import WebMidi from "webmidi";
//"webmidi": "^2.5.1"
import * as Tone from 'tone'
const synth = new Tone.Synth().toDestination();
export var output: any = undefined;

export type SoundType = "MIDI" | "REMOTE" | "LOCAL";
let soundType : SoundType = "LOCAL";

export function initMidi() {
    if (soundType === "MIDI") {
        /*
        WebMidi.enable((err: any) => {
            if (err) {
                console.log("WebMidi could not be enabled.", err);
            } else {
                output = WebMidi.outputs[0];
                console.log("Found output: ", output.name);
            }
        });
        //WebMidi.disable()
         */
    } else if(soundType === "REMOTE"){
    }
}

export async function stopNote(note: number) {
    if (soundType === "MIDI") {
        //output.stopNote(note)
    } else if(soundType === "REMOTE"){
        return pipeMidi({
            midiport: 'IAC Driver Bus 2',
            midicommand: 'noteoff',
            channel: 1,
            note: note
        });
    }
}


export async function playNote(note: number, noteString : string) {
    if (soundType === "MIDI") {
        //output.playNote(note);
    } else if(soundType === "REMOTE"){
        return pipeMidi({
            midiport: 'IAC Driver Bus 2',
            midicommand: 'noteon',
            channel: 1,
            note: note
        })
    } else if(soundType === "LOCAL"){
        synth.triggerAttackRelease(noteString, "8n");
    }
}

async function pipeMidi(data: any) {
    await fetch("http://192.168.1.20:4000/sendmidi", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
}

