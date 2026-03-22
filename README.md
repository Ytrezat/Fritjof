Fritjof v2 - Hnefatafl games review web app

----------

Fritjof is a review app for Copenhagen hnefatafl games. It includes basic functionalities as handling of variations tree, comments, markers / arrows or position editing.

Note that the winning conditions checked in the app are slightly different than the official Copenhagen rules:
- White wins when the king reaches a corner, or if he builds one of the two elementary edge forts
- Black wins when the king is captured, or when White cannot achieve his goals anymore, even if Black stops playing.
- Black wins on direct repetition of two moves.
- Longer repetition cycles, or undecided games (> 50 moves without captures) lead to draws. This allows the existence of some special draw forts with a 3-fold (or more) repetition cycle.

*************************************
How to import games played at http://aagenielsen.dk:
1/ Find your game in the archive
2/ Click on "list"
3/ Copy the sequence of moves, e.g.:
```
1.     	h1-h3     	e7-c7    
2.     	k5-i5     	g7-i7    
3.     	k8-k9     	f8-b8    
4.     	f10-b10     	f7-f10    
5.     	k9-f9xf10     	h6-h9
```
4/ In the app, go to Edit mode and click "Import move list".
5/ Past the sequence of moves.

**************************************
The source code of this program is available at https://github.com/Ytrezat/Fritjof.


**************************************
WARNING: This is an amateur work, open-source and free to download and use. I decline responsibility for any consequence which could arise due to the use of this program.
The code was written with the help of a LLM.

Copyright T. Vieu 2026
