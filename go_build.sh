cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" src
GOARCH=wasm GOOS=js go build -o src/lib.wasm main.go