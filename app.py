from flask import Flask,request
from flask_socketio import SocketIO, emit, join_room ,leave_room

app = Flask(__name__)

app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins='*')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/oekaki')
def oekaki():
    return app.send_static_file('oekaki/index.html')

@socketio.on('join_room')
def on_join_room(data):
    room_id = data['room_id']
    socket_id = request.sid

    join_room(room_id)
    emit('join_room',{'socket_id':socket_id},room=room_id)

@socketio.on('send_sdp')
def on_send_sdp(data):
    sender = request.sid
    recipient = data['recipient']
    description = data['description']
    emit('send_sdp',{'description':description,'sender':sender},room=recipient)

if __name__== "__main__":
    socketio.run(app=app,host='0.0.0.0',port=18080,debug=True)
