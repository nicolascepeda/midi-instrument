import {IonContent, IonLabel, IonPage, IonSegment, IonSegmentButton} from '@ionic/react';
import React from 'react';
import './PageHome.css';
import PitchVisualization, {PitchDisplayType} from "./PitchVisualization";

interface Props {
}

interface State {
    displayType : PitchDisplayType;
}

class PageHome extends React.Component<Props, State> {
    constructor(props : Props){
        super(props);

        this.state = {
            displayType : "SPIRAL"
        }
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
                    </IonSegment>
                    <PitchVisualization displayType={this.state.displayType}></PitchVisualization>
                </IonContent>
            </IonPage>
        );
    }
};

export default PageHome;
