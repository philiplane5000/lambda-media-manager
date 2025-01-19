# Media Asset Manager Lambda

A serverless API that manages media assets in S3, providing presigned URLs for secure access to media files.

## Overview

This Lambda function serves as a media web service that:
- Lists objects from specified S3 bucket directories
- Generates presigned URLs for secure, time-limited access
- Filters out empty objects and Glacier storage class items
- Supports optional subdirectory filtering
- Configurable result limits

## Setup

1. Install dependencies:
```bash
# Install root dev dependencies
npm install

# Install Lambda function dependencies
cd src/handlers
npm install