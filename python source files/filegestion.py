# -*- coding: utf-8 -*-
"""
Created on Wed Sep 18 17:14:32 2019

@author: Thibault Vieu
"""
from tkinter import filedialog
from tkinter import Tk
from pickle import load, dump

from moves import playmove,add_move
from init import initialize
from util import *

def convertfile(data):
    alpha = ['a','b','c','d','e','f','g','h','i','j','k']
    f=open(data, "r")
    contents =f.read()
    res = []
    write=False
    c=''
    for e in contents:
        if (e==' ' or e=='\n') and write:
            write=False
            res.append(c)
            c=''
        if write:
            c+=e
        if e=='\t':
            write=True
        if e=='r':
            break
    selection, board, i_reader, variations = initialize()
    for e in res:
        c1 = alpha.index(e[0])
        c=''
        i=1
        while e[i]!='-':
            c+=e[i]
            i+=1
        i+=1
        c2 = int(c)-1
        c3 = alpha.index(e[i])
        i+=1
        c = e[i]
        i+=1
        if i<=len(e)-1:
            if e[i]!='x':
                c+=e[i]
        c4 = int(c)-1
        selection, variations, i_reader = add_move(convert_coord_to_nb((c1,c2)),convert_coord_to_nb((c3,c4)),board,i_reader,variations)
        board = playmove(board,variations[i_reader][0],1,i_reader,variations)
    return variations

def opentaflfile(path):
    with open(path, "rb") as fp:
        variations = load(fp)
    return variations

def loadgame(board,variations):
    root = Tk()
    root.filename =  filedialog.askopenfilename(title = "Select file",filetypes = (("hntf or txt files","*.hntf"),("tafl or txt files","*.txt"),("all files","*.*")))
    path = root.filename
    extension=''
    if len(path)>=4:
        for i in range(1,5):
            extension+=path[-i]
    if extension=='txt.':
        try:
            tselection, tboard, ti_reader, tvariations = initialize()
            tvariations=convertfile(path)
            selection, board, i_reader, variations = tselection, tboard, ti_reader, tvariations
        except:
            pass
    if extension=='ftnh':
        try:
            tselection, tboard, ti_reader, tvariations = initialize()
            tvariations=opentaflfile(path)
            selection, board, i_reader, variations = tselection, tboard, ti_reader, tvariations
        except:
            pass
    root.destroy()
    return board,variations
    
def savegame(variations):
    root = Tk()
    root.filename = filedialog.asksaveasfilename(title = "Save as",filetypes = (("hntf files","*.hntf"),("all files","*.*")))
    name = root.filename
    if root.filename!='':
        if len(name)>=5:
            if name[-5]+name[-4]+name[-3]+name[-2]+name[-1]!=".hntf":
                name+=".hntf"
        else:
            name+=".hntf"
        with open(name, "wb") as fp:
            dump(variations, fp)
    root.destroy()