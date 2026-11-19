FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends chromium python3 socat fonts-liberation xvfb xdotool ffmpeg openbox && rm -rf /var/lib/apt/lists/*
WORKDIR /fixture
COPY serve.py mission.py scenes.json sites.json play.html play.js fakestagram.py fakestagram.html fakesta.css fakesta.js start.sh input.py video.sh ./
COPY fakesta-extension ./fakesta-extension
COPY artwork ./artwork
COPY policy.json /etc/chromium/policies/managed/phish-out.json
COPY build-policy.py ./
RUN python3 build-policy.py
USER 1000:1000
ENTRYPOINT ["/bin/sh", "/fixture/start.sh"]
