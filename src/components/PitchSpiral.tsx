import React from 'react';
import './PitchSpiral.css';

interface Props {
}

interface State {
    description: string;
}

const noiseLevel = -60;
const harmonics = 10;
const pitchRange = 3;
const fftSize = 1024 * 16;
const lineWidthPerDB = 0.002;
const innerLineLevel = 20;
const offsetCorrection = 34;

const zeroPitchFrequency = (440 - offsetCorrection) * Math.pow(2, 3 / 12);
const pitchLabels = ["c", "", "d", "", "e", "f", "", "g", "", "a", "", "b"];

class PitchSpiral extends React.Component<Props, State> {
    // @ts-ignore
    private spiralCanvas: HTMLCanvasElement;
    // @ts-ignore
    private textOutput : HTMLElement;
    // @ts-ignore
    private spiralCtx: CanvasRenderingContext2D;

    async componentDidMount() {
        this.spiralCanvas = document.getElementById("this.spiralCanvas") as HTMLCanvasElement;

        this.textOutput = document.getElementById("textOutput")!;
        this.spiralCtx = this.spiralCanvas.getContext('2d')!;
        this.spiralCtx.fillStyle = 'rgb(0, 0, 0)';

        this.spiralCtx.fillRect(0, 0, this.spiralCanvas.width, this.spiralCanvas.height);

        this.init()
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

    draw(analyserNode: AnalyserNode) {
        const bufferLength: number = analyserNode.frequencyBinCount;
        const dataArray: Float32Array = new Float32Array(bufferLength);
        const indices = {
            low: Math.floor(this.pitchToIndex(-pitchRange, bufferLength)),
            high: Math.ceil(this.pitchToIndex(pitchRange, bufferLength))
        };

        setTimeout(() => this.draw(analyserNode), 100);

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

        this.textOutput.innerHTML =
            "dominant frequency: " + (dominantFrequency + offsetCorrection).toFixed(2) + "Hz" +
            "<br>" + "score: " + score.toFixed(1) +
            "<br>" + "candidates: " + countCandidates;

        this.spiralCtx.fillStyle = 'rgb(0, 0, 0)';
        this.spiralCtx.fillRect(0, 0, this.spiralCanvas.width, this.spiralCanvas.height);

        const offsets = this.drawingOffsets();

        this.spiralCtx.font = offsets.radius * 0.1 + "px DUMMY";
        this.spiralCtx.textAlign = "center";
        this.spiralCtx.textBaseline = "middle";
        const r0 = offsets.radius * (0.5 - pitchRange * 0.1 - 0.05);
        const r1 = offsets.radius * (0.5 + pitchRange * 0.1 + 0.05);
        const r2 = offsets.radius * (0.5 + pitchRange * 0.1 + 0.10);
        for (let i = 0; i < 12; i++) {
            let alpha = 2 * Math.PI * i / 12;
            let c = Math.cos(alpha);
            let s = Math.sin(alpha);
            let center = offsets.center;
            if (pitchLabels[i] !== "") {
                this.spiralCtx.strokeStyle = "white";
            } else {
                this.spiralCtx.strokeStyle = "grey";
            }
            this.spiralCtx.beginPath();
            this.spiralCtx.moveTo(center.x + r0 * s, center.y - r0 * c);
            this.spiralCtx.lineTo(center.x + r1 * s, center.y - r1 * c);
            this.spiralCtx.stroke();
            this.spiralCtx.strokeStyle = "white";
            this.spiralCtx.strokeText(pitchLabels[i], center.x + r2 * s, center.y - r2 * c);
        }

        const dp = 1 / (12 * 20)
        let lastxy = this.pitchPosition(offsets, -pitchRange - dp / 2);
        for (let p = -pitchRange; p <= pitchRange; p += dp) {
            const xy = this.pitchPosition(offsets, p + dp / 2);
            const index = Math.round(this.pitchToIndex(p, bufferLength));
            const db = Math.max(0, dataArray[index] - noiseLevel);
            const hueDegrees = this.fractionalPart(p / 3) * 360;
            this.linePath(this.spiralCtx, lastxy, xy);

            if (db > 0) {
                this.spiralCtx.lineWidth = 1 + db * lineWidthPerDB * offsets.radius;
                this.spiralCtx.strokeStyle = "hsl(" + hueDegrees + ", 30%, 50%)";
            } else {
                this.spiralCtx.lineWidth = 1;
                this.spiralCtx.strokeStyle = "grey";
            }
            this.spiralCtx.stroke();
            if (db > innerLineLevel) {
                this.linePath(this.spiralCtx, lastxy, xy);
                const iDB = db - innerLineLevel;
                this.spiralCtx.lineWidth = 1 + iDB * lineWidthPerDB * offsets.radius;
                this.spiralCtx.strokeStyle = "hsl(" + hueDegrees + ", 100%, 70%)";
                this.spiralCtx.stroke();
            }
            lastxy = xy;
        }
        this.spiralCtx.lineWidth = 1;

        if (score >= 10) {
            const p = this.frequencyToPitch(dominantFrequency);
            const r = 0.05 * offsets.radius * Math.min(1, score / 30);
            const center = this.pitchPosition(offsets, p);
            const inner = this.pitchPosition(offsets, p, -r);
            const outer = this.pitchPosition(offsets, p, r);
            this.spiralCtx.strokeStyle = "white";
            this.circlePath(this.spiralCtx, center, r);
            this.spiralCtx.lineWidth = 2;
            this.spiralCtx.stroke();
            this.spiralCtx.lineWidth = 1;
            this.linePath(this.spiralCtx, inner, outer);
            this.spiralCtx.stroke();
        }
    }

    indexToFrequency(i: number, bufferLength: number) {
        return i / bufferLength * 22050 ;
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
        const w = this.spiralCanvas.width;
        const h = this.spiralCanvas.height;
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
            <canvas id="this.spiralCanvas" width={500} height={500}></canvas>
            <div id="textOutput">hoi</div>
        </div>;
    }
}

export default PitchSpiral;
