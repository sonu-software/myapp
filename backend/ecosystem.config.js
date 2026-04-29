module.exports = {
  apps: [
    {
      name: "backend",
      script: "venv/bin/uvicorn",
      args: "main:app --host 0.0.0.0 --port 8000",
      cwd: "/home/ubuntu/myapp/backend",
      interpreter: "python3",
      env: {
        PYTHONUNBUFFERED: "1"
      }
    }
  ]
};
