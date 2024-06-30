from flask import Flask, render_template
from flask_socketio import SocketIO
import time
import threading

app = Flask(__name__)
socketio = SocketIO(app)

@app.route('/')
def index():
    return render_template('indextest.html')

def background_task():
    while True:
        socketio.sleep(5)
        speed = 156  # Example data
        battery = 32  # Example data
        socketio.emit('updateData', {'speed': speed, 'battery': battery})

@socketio.on('connect')
def test_connect():
    socketio.start_background_task(target=background_task)

if __name__ == '_main_':
    socketio.run(app)
