from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
import subprocess

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
CLIPS_FOLDER = "clips"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CLIPS_FOLDER, exist_ok=True)

app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024

@app.route("/")
def home():
    return jsonify({
        "name": "Clip YS AI",
        "status": "Backend is ready"
    })

@app.route("/upload", methods=["POST"])
def upload_video():

    if "video" not in request.files:
        return jsonify({"error": "No video selected"}), 400

    video = request.files["video"]

    if not video.filename:
        return jsonify({"error": "Invalid filename"}), 400

    extension = os.path.splitext(video.filename)[1].lower()

    if extension not in [".mp4", ".mov", ".mkv", ".webm"]:
        return jsonify({"error": "Unsupported video format"}), 400

    filename = str(uuid.uuid4()) + extension
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    video.save(filepath)

    return jsonify({
        "message": "Video uploaded successfully",
        "filename": filename
    })

@app.route("/generate", methods=["POST"])
def generate_clips():

    data = request.get_json()
    filename = data.get("filename") if data else None

    if not filename or os.path.basename(filename) != filename:
        return jsonify({"error": "Invalid filename"}), 400

    filepath = os.path.join(UPLOAD_FOLDER, filename)

    if not os.path.isfile(filepath):
        return jsonify({"error": "Video not found"}), 404

    output_folder = os.path.join(
        CLIPS_FOLDER,
        os.path.splitext(filename)[0]
    )

    os.makedirs(output_folder, exist_ok=True)

    output_pattern = os.path.join(
        output_folder,
        "clip_%03d.mp4"
    )

        command = [
        "ffmpeg", "-y",
        "-i", filepath,
        "-map", "0:v:0",
        "-map", "0:a?",
        "-c", "copy",
        "-f", "segment",
        "-segment_time", "30",
        "-reset_timestamps", "1",
        "-segment_format", "mp4",
        output_pattern
        ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        return jsonify({
            "error": "Video processing failed"
        }), 500

    clips = [
        f for f in sorted(os.listdir(output_folder))
        if f.endswith(".mp4")
    ]

    return jsonify({
        "message": "Clips generated successfully",
        "clips": clips
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
