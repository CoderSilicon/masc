![Image](./src/lib/assets/masc.svg) 

<div style="text-align: center;font-size: 3rem">Masc</div>
<p style="text-align: center;">
  <strong>Concealment & Steganographic Caching</strong><br>
  <em>Because if your data is on the cloud, it’s not a vault—and if it's encrypted in plain sight, it’s a target.</em>
</p>



## What is masc?

**masc** is a stealth tool that lets you tuck secret messages or entire zip files directly inside regular picture files.

Instead of turning your data into a scrambled code (encryption) that practically screams "look at me!", **masc** uses a technique called **steganography**. It hides your secret inside an ordinary image—like a photo of a dog or a simple icon—so no one looking at the file ever knows there's a hidden layer.

Everything happens **100% locally on your own machine**. No cloud uploads, no servers, and no internet tracking.


## How the Tech Works

### 1. Pixel Bit-Tweak (LSB Method)

Digital photos are made of tiny colored squares called pixels. Each pixel’s color is driven by red, green, and blue numbers stored in **bits** (1s and 0s).

* **masc** swaps out the very last bit (the *Least Significant Bit*) of a pixel's color code with a bit from your secret text.
* Changing a color code from `11111111` to `11111110` alters the pixel's shade by less than $0.5\%$. Human eyes literally cannot tell the difference, but a computer reading those exact bits can pull your secret right back out.

### 2. File Tagging (EOF Method)

When a computer opens a JPEG image, it looks for a digital "End of File" marker (EOF) so it knows where the image ends.

* **masc** takes your secret `.zip` archive and attaches it right after that end-marker.
* Photo programs stop reading at the marker, so the picture displays normally. Unzipping tools like 7-Zip read past the marker and extract your hidden folder.


## ⚙️ Core Capabilities

| Feature | Science & Mechanics | Practical Benefit |
| --- | --- | --- |
| **Pixel Hiding** | Tweaks raw pixel color bits ($LSB$ modification) | Hide text inside PNG images without changing how they look. |
| **File Stacking** | Appends extra binary data past the EOF marker | Combine a decoy photo and a `.zip` archive into a single file. |
| **Client Isolation** | Runs entirely in local memory buffers | Zero data leaves your computer; nothing ever hits the web. |
| **RAM Cleanup** | Automatically zeroes out allocated memory | Secret data disappears from computer RAM the instant you're done. |

---

## 🚀 The Bottom Line
**masc** gives you ability to inject and hide your stuffs inside something completely normal. it's a glimpse of steganography and its use cases, Beaware of it's consequences and ```~use it for educational purposes~```.