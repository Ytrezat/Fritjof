# Fritjof v2 - Hnefatafl Games Review Web App

---

Fritjof is a review app for Copenhagen hnefatafl games. It includes basic functionalities such as handling of variations tree, comments, markers/arrows, and position editing.

> **Note:** The winning conditions checked in the app are slightly different from the official Copenhagen rules:
>
> - White wins when the king reaches a corner, or if the king is on the edge, protected by one of the two elementary edge forts.
> - Black wins when the king is captured, or, if "full surround" is set, when White is completely surrounded.
> - If "partial surround" is set, Black wins as soon as White cannot achieve his goals anymore, even if Black stops playing. 
> - Black wins on direct repetition of two moves.
> - Draws are detected when more than 100 moves are played without capture (if "full surround" is set), or 50 moves (if "partial surround" is set).
> - Long repetition cycles are not detected and will eventually lead to draws after reaching the maximum of moves. This in principle allows for the existence of some special draw forts with a 3-fold (or more) repetition cycle.

---

## How to Import Games Played at [aagenielsen.dk](http://aagenielsen.dk)

1. Find your game in the archive.  
2. Click on **"list"**.  
3. Copy the sequence of moves, e.g.:

```
1.     	h1-h3     	e7-c7    
2.     	k5-i5     	g7-i7    
3.     	k8-k9     	f8-b8    
4.     	f10-b10     	f7-f10    
5.     	k9-f9xf10     	h6-h9
```

4. In the app, go to **Edit mode** and click **"Import move list"**.  
5. Paste the sequence of moves.

---

## Source Code

The source code of this program is available at:  
[https://github.com/Ytrezat/Fritjof](https://github.com/Ytrezat/fritjof)

---

## Disclaimer

**WARNING:** This is an amateur work, open-source, and free to download and use. I decline responsibility for any consequence which could arise due to the use of this program.  

The code was written with the help of a LLM.

---

## License

[![CC BY-NC-SA 4.0][cc-by-nc-sa-shield]][cc-by-nc-sa]

This work is licensed under a [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License][cc-by-nc-sa].

[![CC BY-NC-SA 4.0][cc-by-nc-sa-image]][cc-by-nc-sa]

[cc-by-nc-sa]: http://creativecommons.org/licenses/by-nc-sa/4.0/  
[cc-by-nc-sa-image]: https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png  
[cc-by-nc-sa-shield]: https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg  

*T.Vieu 2026*
