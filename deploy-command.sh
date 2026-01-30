#!/bin/bash
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
cd /Users/nakazatokeita/meishi
chmod +x scripts/deploy-to-cloud-run.sh
./scripts/deploy-to-cloud-run.sh
