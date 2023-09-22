'use strict';
+function () {
    const url = new URL(document.location);
    const params = url.searchParams;
    
    if (params.get('room_id') === null) {
        //window.location.href = '/';
        throw new Error('room_id パラメータがありません');
    }
}();


const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1000;
const DEFAULT_MODE = 'move';
const DEFAULT_ZOOM = 1;

const ROOM_ID = new URL(document.location).searchParams.get('room_id');
const RTC_PEER_CONNTCTION_CONFIG = {
    iceServers: [
        //JSON.parse(localStorage.getItem('stun_config')),
        //JSON.parse(localStorage.getItem('turn_config')),
        {urls: 'stun:stun.l.google.com:19302'},
    ],
	sdpSemantics: "unified-plan",
};


class Line {
    constructor ({pen,points = []}) {
        this.pen = pen;
        this.points = points;
    }
    draw(ctx) {
        ctx.save();
        ctx.strokeStyle = this.pen.color;
        ctx.lineWidth = this.pen.lineWidth;
        ctx.lineCap = this.pen.lineCap;
        ctx.beginPath();
        if (this.points.length > 0) {
            ctx.moveTo(this.points[0].x, this.points[0].y);
        }
        this.points.forEach(point=>{
            ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    }
    addPoint(x,y) {
        this.points.push({x:x,y:y});
    }
}

function canvasMove(x,y,canvas) {
    const baseX = parseInt(canvas.style.left,10) || 0;
    const baseY = parseInt(canvas.style.top,10) || 0;

    //const left = `${baseX + x}px`;
    //const top = ` ${baseY + y}px`;
    
    const left = `${x}px`;
    const top = ` ${y}px`;
    
    canvas.style.left = left;
    canvas.style.top = top;
}

function draw(ctx,lines) {
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
    ctx.restore();
    lines.forEach((line)=>{
        line.draw(ctx);
    });
}

function penOptions() {
    return { //TODO:idが存在しない場合エラー
        color:document.getElementById('color').value,
        lineWidth:document.getElementById('thick').value,
        lineCap:'round',
    }
}

class Peer {
    constructor (socketId) {
        this.socketId = socketId;

        this.pc = new RTCPeerConnection(RTC_PEER_CONNTCTION_CONFIG);

        this.pc.addEventListener('icecandidate',(event) => {
            if (event.candidate === null) {
                socket.emit('send_sdp',{
                    'description':this.pc.localDescription, 
                    'recipient':this.socketId, 
                });
            }
        });
    }
    setupLineChannel(lineChannel) {
        this.lineChannel = lineChannel;
        this.lineChannel.addEventListener('message',this.lineChannelOnMessage);
    }
    setupMessageChannel(messageChannel) {
        this.messageChannel = messageChannel;
        this.messageChannel.addEventListener('message',e=>{
            if (e.data.split(';')[0] === 'resend_all_lines') {
                for (let line of lines) {
                    this.sendLine(line);
                }
            }
        });
        messageChannel.addEventListener('open',()=>{
            console.log('open');
            if (this.socketId === otherPeers[0].socketId) {
                this.messageChannel.send('resend_all_lines');
            }
        });
    }
    async sendOffer () {
        this.setupLineChannel(this.pc.createDataChannel('line'));
        this.setupMessageChannel(this.pc.createDataChannel('message'));
        const description = await this.pc.createOffer();
        await this.pc.setLocalDescription(description);
        // icecandidate イベントが発生する
    }
    async sendAnswer () {
        const description = await this.pc.createAnswer();
        await this.pc.setLocalDescription(description);
        // icecandidate イベントが発生する
    }
    async setRemote (description) {
        this.pc.addEventListener('datachannel',(e) => {
            if (e.channel.label === 'line') {
                this.setupLineChannel(e.channel);
            }
            if (e.channel.label === 'message') {
                this.setupMessageChannel(e.channel);
            }
        });
        await this.pc.setRemoteDescription(description);
    }
    sendLine (line) {
        console.log('sendLine');
        this.lineChannel.send(JSON.stringify(line));
    }
    lineChannelOnMessage = (event) => {
        lines.push(new Line(JSON.parse(event.data)));
    }
}


const whiteboard = document.getElementById("whiteboard");
if (!whiteboard) {throw 'whiteboard'}

if (typeof whiteboard.getContext !== 'function') {throw 'whiteboard_ctx'};
const whiteboardCtx = whiteboard.getContext('2d');

whiteboard.width = CANVAS_WIDTH;
whiteboard.height = CANVAS_HEIGHT;
whiteboard.style.width = CANVAS_WIDTH;
whiteboard.style.height = CANVAS_HEIGHT;

const socket = io(window.location.host,{path:"/p2p-whiteboard/socket.io"});
const roomId = new URL(document.location).searchParams.get('room_id');
const otherPeers = [];

let mode = DEFAULT_MODE;

let zoom = DEFAULT_ZOOM;
let mousepressed = false;
let startX = NaN;
let startY = NaN;

const lines = [];
let currentLine = null;

addEventListener('wheel',e=>{
    zoom += e.deltaY / 1000;
    if (zoom < 0.1) {
        zoom = 0.1;
    }
});

whiteboard.addEventListener('mousedown', e => {
    mode = document.getElementById('mode').value;
    if (mode === 'move') {
        const rect = whiteboard.getBoundingClientRect();
        startX = e.clientX - rect.x + CANVAS_WIDTH * (1 - zoom) / 2;
        startY = e.clientY - rect.y + CANVAS_HEIGHT * (1 - zoom) / 2;
    }
    if (mode === 'draw') {
        const rect = whiteboard.getBoundingClientRect();
        currentLine = new Line({
            'pen':penOptions(),
            'points':[(e.clientX - rect.x) / (zoom),(e.clientY - rect.y) / (zoom)]
        });
        lines.push(currentLine);
    }
    mousepressed = true;
});

addEventListener("mouseup", () => {
    if (mode === 'draw' && currentLine !== null) {
        for (let peer of otherPeers){peer.sendLine(currentLine);}
    }
    currentLine = null;
    mousepressed = false;
});

addEventListener('mousemove', e => {
    if (mousepressed) {
        const rect = whiteboard.getBoundingClientRect();
        if (mode === 'move') {
            canvasMove(e.clientX - startX,e.clientY - startY,whiteboard);
        }
        if (mode === 'draw') {
            currentLine.addPoint((e.clientX - rect.x) / (zoom),(e.clientY - rect.y) / (zoom));
        }
    }
});

function loop () {
    whiteboard.style.transform = `scale(${zoom})`;
    draw(whiteboardCtx,lines);
    requestAnimationFrame(loop);
}

function undo () {
    lines.pop();
}


socket.on('join_room',e=>{
    console.log('join_room');
    if (e.socket_id === socket.id) {return};
    const peer = new Peer(e.socket_id);
    otherPeers.push(peer);
    peer.sendOffer();
});

socket.on('send_sdp',e => {
    console.log('send_sdp');
    const filteredPeers = otherPeers.filter(d=>{return d.socketId===e.sender});
    if (filteredPeers.length === 0) {
        const peer = new Peer(e.sender);
        otherPeers.push(peer);
        peer.setRemote(e.description);
        peer.sendAnswer();
    } else {
        const peer = filteredPeers[0];
        peer.setRemote(e.description);
    }
});

whiteboardCtx.fillStyle = '#fff';
whiteboardCtx.fillRect(0,0,whiteboard.width,whiteboard.height);

loop();

socket.emit('join_room',{
    'room_id':roomId,
});
