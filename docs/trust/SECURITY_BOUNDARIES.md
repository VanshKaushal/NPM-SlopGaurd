# SECURITY BOUNDARIES RFC

## 1. Abstract
This document outlines the strict isolation layers within the SlopGuard architecture, defining what components can trust each other.

## 2. Network Boundary
All external network interactions are treated as hostile. Responses from package registries are untrusted until cryptographic signatures and hashes are fully validated in an isolated memory buffer.

## 3. File System Boundary
SlopGuard operates with minimum necessary privileges. It strictly validates file paths within tarballs to prevent arbitrary file overwrite attacks (e.g., zip slip) during extraction.

## 4. Process Boundary
Lifecycle scripts (e.g., `postinstall`) executed during the verification phase run in heavily sandboxed subprocesses with limited access to ambient environment variables and restricted network access if enforced by policy.
