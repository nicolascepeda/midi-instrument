import {IonContent, IonLabel, IonPage, IonSegment, IonSegmentButton} from '@ionic/react';
import React from 'react';
import './PageHome.css';
import PitchVisualization, {PitchDisplayType} from "./PitchVisualization";
import PitchPlayer from "./PitchPlayer";
import {initMidi} from "./DataMidi";

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
        };
        initMidi();
    }

    componentDidMount() {
    }

    render() {
        const play: boolean = true;
        return (
            <IonPage>
                <IonContent fullscreen>
                    {play ?
                        <>
                            <PitchPlayer></PitchPlayer>
                        </>
                        :
                        <>
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
                        </>
                    }
                </IonContent>
            </IonPage>
        );
    }
};

export default PageHome;
