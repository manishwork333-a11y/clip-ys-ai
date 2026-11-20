
/* CLIP YS AI - COMPLETE UPLOAD, GENERATE AND DOWNLOAD SYSTEM */

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

    // CLIP RESULTS AREA
    const results = document.createElement("div");
    results.id = "clipResults";
    results.style.marginTop = "20px";
    results.style.display = "flex";
    results.style.flexDirection = "column";
    results.style.gap = "12px";

    message.insertAdjacentElement("afterend", results);


    // VIDEO SELECTION
    uploadInput.addEventListener("change", function () {

        selectedFile = uploadInput.files[0];

        results.innerHTML = "";

        if (!selectedFile) return;

        if (!selectedFile.type.startsWith("video/")) {
            message.textContent = "Please select a valid video.";
            selectedFile = null;
            return;
        }

        if (videoURL) {
            URL.revokeObjectURL(videoURL);
        }

        videoURL = URL.createObjectURL(selectedFile);

        preview.src = videoURL;
        preview.hidden = false;
        preview.load();

        message.textContent =
            "Video selected: " +
            (selectedFile.size / (1024 * 1024)).toFixed(2) +
            " MB. Press Generate Clips.";

    });


    // UPLOAD VIDEO
    async function uploadVideo(file) {

        message.textContent = "STEP 1: Checking server...";

        let ping;

        try {
            ping = await fetch(API + "/", {
                method: "GET",
                cache: "no-store"
            });

        } catch (error) {
            throw new Error("SERVER CONNECTION FAILED");
        }

        if (!ping.ok) {
            throw new Error("SERVER ERROR: " + ping.status);
        }

        message.textContent = "STEP 2: Uploading video...";

        const formData = new FormData();
        formData.append("video", file);

        let response;

        try {
            response = await fetch(API + "/upload", {
                method: "POST",
                body: formData
            });

        } catch (error) {
            throw new Error("UPLOAD CONNECTION FAILED");
        }

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "UPLOAD FAILED");
        }

        if (!result.filename) {
            throw new Error("VIDEO FILENAME NOT RECEIVED");
        }

        return result.filename;
    }


    // GENERATE CLIPS
    generateButton.addEventListener("click", async function () {

        if (busy) return;

        if (!selectedFile) {
            message.textContent = "Please select a video first.";
            return;
        }

        busy = true;
        generateButton.disabled = true;
        results.innerHTML = "";

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
                throw new Error(result.error || "GENERATION FAILED");
            }

            if (!result.video_id || !Array.isArray(result.clips)) {
                throw new Error("INVALID CLIP RESPONSE");
            }

            message.textContent =
                "SUCCESS! " + result.count + " clips generated.";

            // CREATE DOWNLOAD LINKS
            result.clips.forEach(function (clipName) {

                const card = document.createElement("div");

                card.style.padding = "15px";
                card.style.border = "1px solid #444";
                card.style.borderRadius = "12px";

                const title = document.createElement("p");
                title.textContent = clipName;
                title.style.marginBottom = "10px";

                const download = document.createElement("a");

                download.href =
                    API + "/download/" +
                    encodeURIComponent(result.video_id) + "/" +
                    encodeURIComponent(clipName);

                download.textContent = "Download " + clipName;
                download.download = clipName;
                download.target = "_blank";
                download.rel = "noopener";

                download.style.display = "inline-block";
                download.style.padding = "10px 16px";
                download.style.background = "#2563eb";
                download.style.color = "#ffffff";
                download.style.borderRadius = "8px";
                download.style.textDecoration = "none";

                card.appendChild(title);
                card.appendChild(download);

                results.appendChild(card);

            });

        } catch (error) {

            message.textContent = "ERROR: " + error.message;

        } finally {

            busy = false;
            generateButton.disabled = false;

        }

    });


    // CLEAN UP PREVIEW
    window.addEventListener("beforeunload", function () {

        if (videoURL) {
            URL.revokeObjectURL(videoURL);
        }

    });

});
