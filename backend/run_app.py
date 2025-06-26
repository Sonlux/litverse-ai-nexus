import subprocess
import sys
import os
import time
import signal
import threading
import webbrowser

def run_fastapi():
    """Run the FastAPI backend server"""
    print("Starting FastAPI backend server...")
    return subprocess.Popen(
        [sys.executable, "run.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )

def run_streamlit():
    """Run the Streamlit frontend"""
    print("Starting Streamlit frontend...")
    return subprocess.Popen(
        [sys.executable, "-m", "streamlit", "run", "streamlit_app.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )

def log_output(process, prefix):
    """Log output from a process with a prefix"""
    for line in iter(process.stdout.readline, ''):
        if not line:
            break
        print(f"{prefix}: {line.strip()}")

def main():
    """Run both FastAPI and Streamlit"""
    try:
        # Start FastAPI backend
        fastapi_process = run_fastapi()
        fastapi_thread = threading.Thread(
            target=log_output, 
            args=(fastapi_process, "FASTAPI"),
            daemon=True
        )
        fastapi_thread.start()
        
        # Wait for FastAPI to start
        print("Waiting for FastAPI server to start...")
        time.sleep(5)
        
        # Start Streamlit frontend
        streamlit_process = run_streamlit()
        streamlit_thread = threading.Thread(
            target=log_output, 
            args=(streamlit_process, "STREAMLIT"),
            daemon=True
        )
        streamlit_thread.start()
        
        # Open browser after a short delay
        time.sleep(3)
        webbrowser.open("http://localhost:8501")
        
        print("\n" + "="*50)
        print("BookBot is running!")
        print("FastAPI backend: http://localhost:8000")
        print("Streamlit frontend: http://localhost:8501")
        print("="*50 + "\n")
        print("Press Ctrl+C to stop both servers")
        
        # Keep the main thread running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nShutting down...")
        
        # Terminate processes
        if 'fastapi_process' in locals():
            fastapi_process.terminate()
            fastapi_process.wait()
            
        if 'streamlit_process' in locals():
            streamlit_process.terminate()
            streamlit_process.wait()
            
        print("Shutdown complete")

if __name__ == "__main__":
    main() 