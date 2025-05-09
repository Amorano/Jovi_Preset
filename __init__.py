# Set the web directory, any .js file in that directory will be loaded by the frontend as a frontend extension
WEB_DIRECTORY = "./web"

class uiPresetManager:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "preset": (["Default", "Preset A", "Preset B", "Preset C"], {"default": "Default"}),
                "strength": ("FLOAT", {"default": 0.5, "min": 0.0, "max": 1.0, "step": 0.01}),
                "intensity": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 3.0, "step": 0.1}),
                "steps": ("INT", {"default": 7, "min": 1, "max": 20}),
                "auto_run_queue": ("BOOLEAN", {"default": True}),
                "interrupt_queue": ("BOOLEAN", {"default": False}),
            },
        }

    RETURN_TYPES = ("FLOAT", "FLOAT", "INT")
    RETURN_NAMES = ("strength", "intensity", "steps")

    FUNCTION = "main"
    CATEGORY = 'uitest'

    def main(self, preset, strength, intensity, steps, auto_run_queue, interrupt_queue):

        return (strength, intensity, steps,)

NODE_CLASS_MAPPINGS = {
    "uiPresetManager": uiPresetManager
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "uiPresetManager": "uiPresetManager Node"
}
