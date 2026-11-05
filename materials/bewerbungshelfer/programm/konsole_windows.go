//go:build windows

package main

import (
	"os/exec"
	"syscall"
)

// konsoleVorbereiten switches the console window to UTF-8, so umlauts show correctly.
func konsoleVorbereiten() {
	syscall.NewLazyDLL("kernel32.dll").NewProc("SetConsoleOutputCP").Call(65001)
}

// ordnerZeigen opens the folder with the new letters in Explorer.
func ordnerZeigen(ordner string) {
	exec.Command("explorer", ordner).Start()
}
