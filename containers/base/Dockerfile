FROM ubuntu:22.04

LABEL maintainer="hamidlabs"
LABEL description="DistSim base machine image with common system tools"

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    curl \
    wget \
    vim \
    nano \
    git \
    iproute2 \
    iputils-ping \
    dnsutils \
    net-tools \
    netcat-openbsd \
    tcpdump \
    traceroute \
    procps \
    htop \
    strace \
    lsof \
    stress-ng \
    ca-certificates \
    jq \
    nodejs \
    npm \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for services
RUN useradd -m -s /bin/bash distsim

# Create the default app directory for user code.
RUN mkdir -p /home/distsim/app && chown distsim:distsim /home/distsim/app

WORKDIR /home/distsim

# Keep container alive
CMD ["sleep", "infinity"]
