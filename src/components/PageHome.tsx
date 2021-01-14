import {IonContent, IonPage} from '@ionic/react';
import React from 'react';
import './PageHome.css';
import PitchSpiral from "./PitchSpiral";

class PageHome extends React.Component {
    render() {
        return (
            <IonPage>
                <IonContent fullscreen>
                    <PitchSpiral></PitchSpiral>
                </IonContent>
            </IonPage>
        );
    }
};

export default PageHome;
