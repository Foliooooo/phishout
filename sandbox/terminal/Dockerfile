# Forensics shell for the PHISH//OUT terminal missions. No network at runtime;
# the case files are generated at build time and are read-only in the container.
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends file unzip binutils xxd less ca-certificates python3 \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --uid 1000 --create-home --shell /bin/bash analyst
COPY build_cases.py /opt/build_cases.py
RUN python3 /opt/build_cases.py /case && chmod -R a-w /case && rm /opt/build_cases.py
COPY bashrc /etc/phishout.bashrc
USER 1000:1000
ENV TERM=xterm-256color HOME=/home/analyst
ENTRYPOINT ["bash", "--rcfile", "/etc/phishout.bashrc", "-i"]
