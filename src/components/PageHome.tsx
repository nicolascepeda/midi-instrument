import {IonContent, IonLabel, IonPage, IonSegment, IonSegmentButton} from '@ionic/react';
import React from 'react';
import './PageHome.css';
import WebMidi from 'webmidi';
import PitchVisualization, {PitchDisplayType} from "./PitchVisualization";

interface Props {
}

interface State {
    displayType: PitchDisplayType;
}

class PageHome extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            displayType: "SPIRAL"
        }
    }

    componentDidMount() {
        WebMidi.enable((err: any) => {
            if (err) {
                console.log("WebMidi could not be enabled.", err);
            } else {
                console.log("WebMidi enabled!");
                console.log(WebMidi.inputs);
                console.log(WebMidi.outputs);
                var output = WebMidi.outputs[0];
                output.playNote("C3");
                output.stopNote("C3");
            }
        });
        /*
        // @ts-ignore
    if (navigator.requestMIDIAccess) {
        // @ts-ignore
        navigator.requestMIDIAccess()
            .then((midiAccess : any) => {
                console.log(midiAccess);
                for (var input of midiAccess.inputs.values()){
                    console.log("input", input);
                }
                for (var output of midiAccess.outputs.values()){
                    console.log("output", output);
                }
            }, (err : any) => {
                console.error("Could not access your midi device", err);
            });
    } else {
        console.log('WebMIDI is not supported in this browser.');
    }*/
    }

    render() {
        return (
            <IonPage>
                <IonContent fullscreen>
                    <IonSegment value={this.state.displayType} onIonChange={e => {
                        // @ts-ignore
                        this.setState({displayType: e.detail.value});
                    }}>
                        <IonSegmentButton value="SPIRAL">
                            <IonLabel>Spiral</IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="LINEAR">
                            <IonLabel>Linear</IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="OSCILLATOR">
                            <IonLabel>Oscillator</IonLabel>
                        </IonSegmentButton>
                    </IonSegment>
                    <PitchVisualization displayType={this.state.displayType}></PitchVisualization>
                </IonContent>
            </IonPage>
        );
    }
};

export default PageHome;
