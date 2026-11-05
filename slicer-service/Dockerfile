FROM ubuntu:24.04

ARG ORCA_VERSION=2.4.2
ARG ORCA_SHA256=d12fb8c8eac1aecd2dfb6377acd48f994f8fa439ed5292fa532dd82880f029fd

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        libdbus-1-3 \
        libegl1 \
        libgl1 \
        libglu1-mesa \
        libgtk-3-0t64 \
        libxcb-cursor0 \
        libxcb-xinerama0 \
        libxkbcommon0 \
        libxkbcommon-x11-0 \
        python3 \
        xauth \
        xvfb \
    && rm -rf /var/lib/apt/lists/*

RUN curl --fail --location --silent --show-error \
        "https://github.com/OrcaSlicer/OrcaSlicer/releases/download/v${ORCA_VERSION}/OrcaSlicer_Linux_AppImage_Ubuntu2404_V${ORCA_VERSION}.AppImage" \
        --output /tmp/orca.AppImage \
    && echo "${ORCA_SHA256}  /tmp/orca.AppImage" | sha256sum --check --status \
    && chmod +x /tmp/orca.AppImage \
    && cd /opt \
    && /tmp/orca.AppImage --appimage-extract \
    && mv /opt/squashfs-root /opt/orca \
    && rm /tmp/orca.AppImage \
    && printf '%s\n' '#!/bin/sh' 'exec xvfb-run -a /opt/orca/AppRun "$@"' > /usr/local/bin/orca-slicer-cli \
    && chmod 0755 /usr/local/bin/orca-slicer-cli

RUN useradd --system --create-home --uid 10001 slicer \
    && mkdir -p /app/profiles \
    && chown -R slicer:slicer /app

WORKDIR /app
COPY --chown=slicer:slicer slicer-service/app.py /app/app.py

ENV HOST=0.0.0.0 \
    PORT=8001 \
    PROFILES_DIR=/app/profiles \
    MAX_UPLOAD_BYTES=52428800 \
    SLICE_TIMEOUT_SECONDS=180 \
    MAX_CONCURRENT_SLICES=1

USER slicer
EXPOSE 8001
CMD ["python3", "/app/app.py"]
