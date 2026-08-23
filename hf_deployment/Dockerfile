# Use the official Valhalla image as the base
FROM ghcr.io/gis-ops/docker-valhalla/valhalla:latest

# Switch to root to install Python and dependencies
USER root

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory for the Python app
WORKDIR /app

# Copy and install Python requirements
COPY backend/requirements.txt .
# Use --break-system-packages if pip complains in newer Ubuntu, but try standard first
RUN pip3 install --no-cache-dir -r requirements.txt || pip3 install --break-system-packages --no-cache-dir -r requirements.txt

# Copy the backend code
COPY backend/ .

# Copy the dataset and map files into the root so they match the local paths
COPY bhubaneswar_women_safe_route_synthetic_dataset.csv /bhubaneswar_women_safe_route_synthetic_dataset.csv
COPY custom_files/ /custom_files/

# Configure Valhalla Environment Variables
ENV build_elevation=False
ENV build_admins=False
ENV build_time_zones=False
ENV serve_tiles=True

# Copy the startup script and make it executable
COPY hf_deployment/start.sh /start.sh
RUN chmod +x /start.sh

# Expose Hugging Face's required port
EXPOSE 7860

# Run the startup script
CMD ["/start.sh"]
