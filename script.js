
/* CLIP YS AI - UPLOAD DIAGNOSTIC SYSTEM */

document.addEventListener("DOMContentLoaded", function () {

    const API = "https://clip-ys-ai.onrender.com";

    const uploadInput = document.getElementById("videoFile");
    const preview = document.getElementById("preview");
    const message = document.getElementById("message");
    const generateButton = document.getElementById("generate");

    let selectedFile = null;
    let videoURL = null;
    let busy = false;

    if (!uploadInput || !preview || !message || !generateButton) {
        alert("Website elements missing!");
        return;
    }

    uploadInput.addEventListener("change", function () {

        selectedFile = uploadInput.files[0];

        if (!selectedFile) return;

        if (!selectedFile.type.startsWith("video/")) {
            message.textContent = "Please select a valid video.";
            return;
        }

        if (videoURL) URL.revokeObjectURL(videoURL);

        videoURL = URL.createObjectURL(selectedFile);
        preview.src = videoURL;
        preview.hidden = false;
        preview.load();

        message.textContent =
            "Video selected: " +
            (selectedFile.size / (1024 * 1024)).toFixed(2) +
            " MB. Press Generate Clips.";

    });

    async function uploadVideo(file) {

        message.textContent = "STEP 1: Checking server...";

        let ping;

        try {
            ping = await fetch(API + "/", {
                method: "GET",
                cache: "no-store"
            });
        } catch (error) {
            throw new Error("SERVER CONNECTION FAILED: " + error.message);
        }

        if (!ping.ok) {
            throw new Error("SERVER ERROR: " + ping.status);
        }

        message.textContent = "STEP 2: Sending video to server...";

        const formData = new FormData();
        formData.append("video", file);

        let response;

        try {
            response = await fetch(API + "/upload", {
                method: "POST",
                body: formData
            });
        } catch (error) {
            throw new Error("UPLOAD CONNECTION FAILED: " + error.message);
        }

        message.textContent = "STEP 3: Server received a response.";

        let result;

        try {
            result = await response.json();
        } catch (error) {
            throw new Error("SERVER RETURNED INVALID RESPONSE.");
        }

        if (!response.ok) {
            throw new Error(result.error || "UPLOAD ERROR " + response.status);
        }

        if (!result.filename) {
            throw new Error("SERVER DID NOT RETURN A FILENAME.");
        }

        return result.filename;
    }

    generateButton.addEventListener("click", async function () {

        if (busy) return;

        if (!selectedFile) {
            message.textContent = "Please select a video first.";
            return;
        }

        busy = true;
        generateButton.disabled = true;

        try {

            const filename = await uploadVideo(selectedFile);

            message.textContent = "UPLOAD SUCCESS! Generating clips...";

            const response = await fetch(API + "/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    filename: filename
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "GENERATION FAILED.");
            }

            message.textContent =
                "SUCCESS! " + result.clips.length +
                " clips generated: " + result.clips.join(", ");

        } catch (error) {

            message.textContent = "ERROR: " + error.message;

        } finally {

            busy = false;
            generateButton.disabled = false;

        }

    });

    window.addEventListener("beforeunload", function () {
        if (videoURL) URL.revokeObjectURL(videoURL);
    });

});
