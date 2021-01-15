import React from 'react';
import './PitchVisualization.css';

export type PitchDisplayType = "LINEAR" | "SPIRAL" | "OSCILLATOR";

interface Props {
    displayType : PitchDisplayType;
}

interface State {
    description: string;
}

const noiseLevel = -60;
const harmonics = 10;
const pitchRange = 3;
//const fftSize = 1024 * 16 * 2;
const fftSize = 2048;
const lineWidthPerDB = 0.002;
const innerLineLevel = 20;
const offsetCorrection = 34;

const zeroPitchFrequency = (440 - offsetCorrection) * Math.pow(2, 3 / 12);
const pitchLabels = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

class PitchVisualization extends React.Component<Props, State> {
    // @ts-ignore
    private canvas: HTMLCanvasElement;
    // @ts-ignore
    private canvasCtx: CanvasRenderingContext2D;
    // @ts-ignore
    private textOutput: HTMLElement;

    async componentDidMount() {
        this.canvas = document.getElementById("this.canvas") as HTMLCanvasElement;

        this.textOutput = document.getElementById("textOutput")!;
        this.canvasCtx = this.canvas.getContext('2d')!;
        this.canvasCtx.fillStyle = 'rgb(0, 0, 0)';

        this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.init();
    }

    init() {
        if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia({audio: true})
                .then((stream: MediaStream) => {
                    let audioCtx = new AudioContext();
                    let source = audioCtx.createMediaStreamSource(stream);

                    const analyserNode = audioCtx.createAnalyser();
                    analyserNode.fftSize = fftSize;
                    analyserNode.smoothingTimeConstant = 0.2;
                    source.connect(analyserNode);
                    this.draw(analyserNode);
                })
                .catch(function (err) {
                    console.log('The following gUM error occured: ' + err);
                });
        } else {
            console.log('getUserMedia not supported on your browser!');
        }
    }

    draw(analyserNode: AnalyserNode){
        switch(this.props.displayType){
            case "LINEAR": return this.drawLinear(analyserNode);
            case "SPIRAL" : return this.drawSpiral(analyserNode);
            case "OSCILLATOR" : return this.drawOscillator(analyserNode);
        }
    }

    drawLinear(analyserNode: AnalyserNode) {
        const bufferLength: number = analyserNode.frequencyBinCount;
        const dataArray: Float32Array = new Float32Array(bufferLength);

        requestAnimationFrame(() => this.draw(analyserNode));

        //Get spectrum data
        analyserNode.getFloatFrequencyData(dataArray);

        //Draw black background
        this.canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        //Draw spectrum
        const barWidth = (this.canvas.width / bufferLength) * 2.5;
        let posX = 0;
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] + 140) * 2;
            this.canvasCtx.fillStyle = 'rgb(' + Math.floor(barHeight + 100) + ', 230, 230)';
            this.canvasCtx.fillRect(posX, this.canvas.height - barHeight / 2, barWidth, barHeight / 2);
            posX += barWidth + 1;
        }
    }

    drawOscillator(analyserNode: AnalyserNode) {
        var bufferLength = analyserNode.frequencyBinCount ;
        var dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteTimeDomainData(dataArray);

        requestAnimationFrame(() => this.draw(analyserNode));

        this.canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.canvasCtx.lineWidth = 2;
        this.canvasCtx.strokeStyle = 'rgb(255, 255, 255)';

        this.canvasCtx.beginPath();

        let sliceWidth = this.canvas.width * 1.0 / bufferLength;
        let x = 0;
        console.log(dataArray);

        for(let i = 0; i < bufferLength; i++) {
            let v = dataArray[i] / 128.0;
            let y = v * this.canvas.height/2;

            if(i === 0) {
                this.canvasCtx.moveTo(x, y);
            } else {
                this.canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.canvasCtx.lineTo(this.canvas.width, this.canvas.height/2);
        this.canvasCtx.stroke();
    }

    drawSpiral(analyserNode: AnalyserNode) {
        const bufferLength: number = analyserNode.frequencyBinCount;
        const dataArray: Float32Array = new Float32Array(bufferLength);
        const indices = {
            low: Math.floor(this.pitchToIndex(-pitchRange, bufferLength)),
            high: Math.ceil(this.pitchToIndex(pitchRange, bufferLength))
        };

        requestAnimationFrame(() => this.draw(analyserNode));

        analyserNode.getFloatFrequencyData(dataArray);

        // find dominant frequency

        let bestIndex = 0;
        let bestScore = 0;
        let countCandidates = 0;
        for (let i = indices.low; i < indices.high; i++) {
            const left = dataArray[i - 1];
            const middle = dataArray[i];
            const right = dataArray[i + 1];
            if (middle > noiseLevel && middle >= left && middle >= right) {
                countCandidates++;
                const ii = i + this.interpolateExtremum(left, middle, right);
                let score = 0;
                for (let j = 1; j <= harmonics && j * ii <= bufferLength - 1; j++) {
                    const raw = dataArray[Math.round(j * ii)];
                    score += Math.max(0, raw - noiseLevel) * (1 - (j - 1) / harmonics);
                }
                if (score > bestScore) {
                    bestScore = score;
                    bestIndex = ii;
                }
            }
        }

        const dominantFrequency = this.indexToFrequency(bestIndex, bufferLength);
        const score = bestScore;

        this.textOutput.innerHTML = `Dominant Frequency: ${(dominantFrequency + offsetCorrection).toFixed(2)}Hz <BR/> Score: ${score.toFixed(1)}<BR/>Candidates: ${countCandidates}`;
        this.canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const offsets = this.drawingOffsets();

        this.canvasCtx.font = offsets.radius * 0.1 + "px DUMMY";
        this.canvasCtx.textAlign = "center";
        this.canvasCtx.textBaseline = "middle";
        const r0 = offsets.radius * (0.5 - pitchRange * 0.1 - 0.05);
        const r1 = offsets.radius * (0.5 + pitchRange * 0.1 + 0.05);
        const r2 = offsets.radius * (0.5 + pitchRange * 0.1 + 0.10);
        for (let i = 0; i < 12; i++) {
            let alpha = 2 * Math.PI * i / 12;
            let c = Math.cos(alpha);
            let s = Math.sin(alpha);
            let center = offsets.center;
            if (pitchLabels[i] !== "") {
                this.canvasCtx.strokeStyle = "white";
            } else {
                this.canvasCtx.strokeStyle = "grey";
            }
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(center.x + r0 * s, center.y - r0 * c);
            this.canvasCtx.lineTo(center.x + r1 * s, center.y - r1 * c);
            this.canvasCtx.stroke();
            this.canvasCtx.strokeStyle = "white";
            this.canvasCtx.strokeText(pitchLabels[i], center.x + r2 * s, center.y - r2 * c);
        }

        const dp = 1 / (12 * 20)
        let lastxy = this.pitchPosition(offsets, -pitchRange - dp / 2);
        for (let p = -pitchRange; p <= pitchRange; p += dp) {
            const xy = this.pitchPosition(offsets, p + dp / 2);
            const index = Math.round(this.pitchToIndex(p, bufferLength));
            const db = Math.max(0, dataArray[index] - noiseLevel);
            const hueDegrees = this.fractionalPart(p / 3) * 360;
            this.linePath(this.canvasCtx, lastxy, xy);

            if (db > 0) {
                this.canvasCtx.lineWidth = 1 + db * lineWidthPerDB * offsets.radius;
                this.canvasCtx.strokeStyle = "hsl(" + hueDegrees + ", 30%, 50%)";
            } else {
                this.canvasCtx.lineWidth = 1;
                this.canvasCtx.strokeStyle = "grey";
            }
            this.canvasCtx.stroke();
            if (db > innerLineLevel) {
                this.linePath(this.canvasCtx, lastxy, xy);
                const iDB = db - innerLineLevel;
                this.canvasCtx.lineWidth = 1 + iDB * lineWidthPerDB * offsets.radius;
                this.canvasCtx.strokeStyle = "hsl(" + hueDegrees + ", 100%, 70%)";
                this.canvasCtx.stroke();
            }
            lastxy = xy;
        }
        this.canvasCtx.lineWidth = 1;

        if (score >= 10) {
            const p = this.frequencyToPitch(dominantFrequency);
            const r = 0.05 * offsets.radius * Math.min(1, score / 30);
            const center = this.pitchPosition(offsets, p);
            const inner = this.pitchPosition(offsets, p, -r);
            const outer = this.pitchPosition(offsets, p, r);
            this.canvasCtx.strokeStyle = "white";
            this.circlePath(this.canvasCtx, center, r);
            this.canvasCtx.lineWidth = 2;
            this.canvasCtx.stroke();
            this.canvasCtx.lineWidth = 1;
            this.linePath(this.canvasCtx, inner, outer);
            this.canvasCtx.stroke();
        }
    }

    indexToFrequency(i: number, bufferLength: number) {
        return i / bufferLength * 22050;
    }

    frequencyToIndex(f: number, bufferLength: number) {
        return f / 22050 * bufferLength;
    }

    indexToPitch(i: number, bufferLength: number) {
        return this.frequencyToPitch(this.indexToFrequency(i, bufferLength));
    }

    pitchToIndex(p: number, bufferLength: number) {
        return this.frequencyToIndex(this.pitchToFrequency(p), bufferLength);
    }

    frequencyToPitch(f: any) {
        return Math.log(f / zeroPitchFrequency) / Math.log(2);
    }

    pitchToFrequency(p: number) {
        return Math.pow(2, p) * zeroPitchFrequency;
    }

    pitchPosition(offsets: any, p: any, radial = 0) {
        const alpha = p * 2 * Math.PI;
        const r = (0.1 * p + 0.5) * offsets.radius;
        const c = Math.cos(alpha);
        const s = Math.sin(alpha);
        return {
            x: offsets.center.x + s * (r + radial)
            , y: offsets.center.y - c * (r + radial)
        }
    }

    interpolateExtremum(left: number, middle: number, right: number) {
        return 0.5 * (left - right) / (left + right - 2 * middle);
    }

    drawingOffsets() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        return {
            center: {
                x: w / 2
                , y: h / 2
            }
            , radius: Math.min(w / 2, h / 2)
        }
    }

    circlePath(ctx: any, xy: any, r: any) {
        ctx.beginPath();
        ctx.arc(xy.x, xy.y, r, 0, 2 * Math.PI);
    }

    linePath(ctx: any, xy0: any, xy1: any) {
        ctx.beginPath();
        ctx.moveTo(xy0.x, xy0.y);
        ctx.lineTo(xy1.x, xy1.y);
    }

    fractionalPart(x: any) {
        // x % 1 is negative for negative x.
        return x - Math.floor(x);
    }

    render() {
        return <div className="pitch-spiral">
            <canvas id="this.canvas" width={500} height={500}></canvas>
            <div id="textOutput">hoi</div>
        </div>;
    }
}

export default PitchVisualization;
