import React from 'react';
import './PitchPlayer.css';
import {playNote, stopNote} from "./DataMidi";

interface Props {
}

const noteLabels: any[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

class PitchPlayer extends React.Component<Props> {
    // @ts-ignore
    private canvas: HTMLCanvasElement;
    // @ts-ignore
    private canvasCtx: CanvasRenderingContext2D;

    // @ts-ignore
    private debug: HTMLElement;

    private config: any;

    async componentDidMount() {
        this.debug = document.getElementById("this.debug") as HTMLElement;
        this.canvas = document.getElementById("this.canvas") as HTMLCanvasElement;
        this.canvasCtx = this.canvas.getContext('2d')!;
        this.canvasCtx.fillStyle = 'rgb(0, 0, 0)';

        this.canvas.addEventListener("touchstart", evt => this.touchStart(evt), false);
        this.canvas.addEventListener("touchend", evt => this.touchEnd(evt), false);
        //this.canvas.addEventListener("touchcancel", evt => this.touchEnd(evt), false);

        this.config = {
            width: this.canvas.width,
            height: this.canvas.height,
            centerX: this.canvas.width / 2,
            centerY: this.canvas.height / 2,
            rotation: -Math.PI / 2,
            innerDistance: 150, //radius * (0.5 - pitchRange * 0.1 - 0.05),
            noteWeight: 15
        }
        this.buildSpiral();
        this.drawSpiral();
    }

    private touchNoteMap : any = {};

    debugText(str : string) {
        this.debug.innerHTML = str;
    }

    async touchStart(evt: TouchEvent) {
        evt.stopPropagation();

        this.drawSpiral();

        for (let i = 0; i < evt.touches.length; i++) {
            const x = evt.touches[i].pageX - this.canvas.offsetLeft;
            const y = evt.touches[i].pageY - this.canvas.offsetTop;

            const note = this.noteAt(x, y);
            if(note >= 0){
                this.touchNoteMap[evt.touches[i].identifier] = note;
                this.drawNote(note, true);
                this.showArmonics(note);
                playNote(note + 48);
            }
        }
    }

    async touchEnd(evt: any) {
        evt.stopPropagation();

        this.drawSpiral();

        let activeTouches : string[] = [];

        for (let i = 0; i < evt.touches.length; i++) {
            const id : string = evt.touches[i].identifier;
            this.drawNote(this.touchNoteMap[id], true);
            activeTouches.push(id + "");
        }

        for(let id of Object.keys(this.touchNoteMap)){
            if(activeTouches.filter(el => el == id +'').length === 0){
                stopNote(this.touchNoteMap[id] + 48);
                delete this.touchNoteMap[id];
            }
        }
    }

    drawLoop(){
        this.drawSpiral();

        for(let id of Object.keys(this.touchNoteMap)){
            this.drawNote(this.touchNoteMap[id], true);
        }
        window.requestAnimationFrame( _ => this.drawLoop());
    }

    noteAt(x: number, y: number) {
        const note : number = this.findNote(x, y);
        return note;
    }

    private notePolygons  : any[] = [];

    findNote(x : number, y : number){
        for(let index = 0; index < 12 * 6; index++){
            if(this.insidePolygon(x, y, this.notePolygons[index])){
                return index;
            }
        }
        return - 1;
    }

    insidePolygon(x : number, y : number, vs : any[]) {
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            const xi = vs[i].x, yi = vs[i].y;
            const xj = vs[j].x, yj = vs[j].y;

            const intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    };

    buildSpiral(){
        const stepSize = 2 * Math.PI / (12 * 4);
        const noteAngle = 2 * Math.PI / 12;

        for (let index = 0; index < 12 * 6; index++) {
            const currentLevel = Math.trunc(index / 12);
            this.notePolygons[index] = [];

            for (let angle = (noteAngle * index); angle <= (noteAngle * (index + 1.01)); angle += stepSize) {
                const currAngle = this.config.rotation + angle;
                const scalar = this.config.innerDistance + this.config.noteWeight * currAngle + currentLevel;
                this.notePolygons[index].push({x: this.config.centerX + scalar * Math.cos(currAngle), y: this.config.centerY + scalar * Math.sin(currAngle)});
            }
            for (let angle = noteAngle * (index + 1.01) - 2 * Math.PI; angle >= (noteAngle * (index)) - 2 * Math.PI; angle -= stepSize) {
                const currAngle = this.config.rotation + angle;
                const scalar = this.config.innerDistance + this.config.noteWeight * currAngle + currentLevel;

                this.notePolygons[index].push({x: this.config.centerX + scalar * Math.cos(currAngle), y: this.config.centerY + scalar * Math.sin(currAngle)});
            }
        }
    }

    drawNote(index : number, selected : boolean){
        if(index === undefined || index < 0 || index > this.notePolygons.length){
            return;
        }
        if(selected){
            this.canvasCtx.fillStyle = "red";
        } else if(noteLabels[index % 12].indexOf("#") >= 0){
            this.canvasCtx.fillStyle = "grey";
        } else {
            this.canvasCtx.fillStyle = "white";
        }
        this.canvasCtx.beginPath();
        for(let point of this.notePolygons[index]){this.canvasCtx.lineTo(point.x, point.y);}
        this.canvasCtx.closePath();
        this.canvasCtx.fill();

        // Border
        this.canvasCtx.strokeStyle = "black";
        this.canvasCtx.lineWidth = 2;
        this.canvasCtx.beginPath();
        for(let point of this.notePolygons[index]){this.canvasCtx.lineTo(point.x, point.y);}
        this.canvasCtx.closePath();
        this.canvasCtx.stroke();
    }

    private major = [2, 2, 1, 2, 2, 2, 1];
    private minor = [2, 1, 2, 2, 1, 2, 2];

    showArmonics(indexRoot : number){
        let index = indexRoot;
        for(let val of this.major){
            index += val;

            this.canvasCtx.fillStyle = "yellow";
            this.canvasCtx.lineWidth = 2;
            this.canvasCtx.beginPath();
            for(let point of this.notePolygons[index]){this.canvasCtx.lineTo(point.x, point.y);}
            this.canvasCtx.closePath();
            this.canvasCtx.fill();
        }
    }

    drawSpiral() {
        this.cleanCanvas("black");

        // Draw Each Note
        for (let index = 0; index < 12 * 6; index++) {
            this.drawNote(index, false);
        }
        // Draw Note Names
        for(let note = 0; note < 12; note++){
            const currAngle = this.config.rotation + (2 * Math.PI / 12) * (note + 0.5);
            const scalar = this.config.innerDistance + 180 + currAngle;

            const x = this.config.centerX + scalar * Math.cos(currAngle);
            const y = this.config.centerY + scalar * Math.sin(currAngle);
            this.canvasCtx.font = "30px Arial";
            if(noteLabels[note].indexOf("#") >= 0){
                this.canvasCtx.fillStyle = "white";
            } else {
                this.canvasCtx.fillStyle = "black";
            }
            this.canvasCtx.textBaseline = "middle";
            this.canvasCtx.textAlign = "center";
            this.canvasCtx.fillText(noteLabels[note], x, y);
        }
    }

    private cleanCanvas(background: string) {
        this.canvasCtx.fillStyle = background;
        this.canvasCtx.fillRect(0, 0, this.config.width, this.config.height);
        this.canvasCtx.beginPath();
    }

    render() {
        return <div className="pitch-player">
            <canvas id="this.canvas" width={700} height={700}></canvas>
            <div className="debug" id="this.debug"></div>
        </div>;
    }
}

export default PitchPlayer;
