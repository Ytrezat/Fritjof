# -*- coding: utf-8 -*-
"""
Created on Wed Sep 18 17:14:32 2019

@author: Thibault Vieu
"""
from moves import playmove
from init import initialize

def add_variation(i_reader,variations):
    variations.insert(i_reader+1,('}',""))
    variations.insert(i_reader+1,('{',""))
    i_reader+=1
    return i_reader,variations

def gotovariation(ivar,variations,board):
    sequenceofmoves = []
    count = 0
    for i in range(ivar,0,-1):
        if variations[i][0]!='{' and variations[i][0]!='}' and count == 0:
            sequenceofmoves.append(variations[i])
        if variations[i][0]=='}':
            count+=1
        if variations[i][0]=='{' and count>0:
            count-=1
        i-=1
    selection, board, i, var = initialize()
    for i in range(len(sequenceofmoves)-1,-1,-1):
        board = playmove(board,sequenceofmoves[i][0],1,i,sequenceofmoves)
    return board

def del_variation(i_reader,variations):
    compt = 1
    if variations[i_reader-1][0]=='{':
        i_reader-=2
        del variations[i_reader+1]
        while compt>0 and i_reader+1<len(variations):
            if variations[i_reader+1][0]=='{':
                compt+=1
            if variations[i_reader+1][0]=='}':
                compt-=1
            del variations[i_reader+1]
    while variations[i_reader][0]=='{':
        i_reader-=1
    while variations[i_reader][0]=='}':
        i_reader+=1
    return i_reader,variations

def goleft(i_reader,variations,board):
    done = False
    played = False
    while not done:
        if variations[i_reader][0]!='{' and variations[i_reader][0]!='}':
            if not played:
                board = playmove(board,variations[i_reader][0],-1,i_reader,variations)
                i_reader-=1
                played = True
            done = True
            if variations[i_reader][0]=='{' or variations[i_reader][0]=='}':
                done = False
        if variations[i_reader][0]=='}' and i_reader!=len(variations)-1:
            compt = 1
            while compt>0:
                i_reader-=1
                if variations[i_reader][0]=='{':
                    compt-=1
                if variations[i_reader][0]=='}':
                    compt+=1
            i_reader-=1
        if variations[i_reader][0]=='{' and i_reader!=0:
            i_reader-=1
        if i_reader==0:
            done=True
    return i_reader,board
    
def goright(i_reader,variations,board):
    done = False
    while not done:
        if variations[i_reader+1][0]=='{':
            compt = 1
            while compt!=0 and i_reader<len(variations)-2:
                i_reader+=1
                if variations[i_reader+1][0]=='}':
                    compt-=1
                if variations[i_reader+1][0]=='{':
                    compt+=1
            i_reader+=1
        if variations[i_reader+1][0]!='{':
            board = playmove(board,variations[i_reader+1][0],1,i_reader+1,variations)
            if(i_reader<len(variations)-2):
                i_reader+=1
            done=True
    return i_reader,board
    
def godown(i_reader,variations,board):
    c = i_reader
    while (variations[c][0]!='{' or variations[c+1][0]=='{' or variations[c+1][0]=='}') and c<len(variations)-1:
        c+=1
    if c<len(variations)-1:
        i_reader=c+1
        board = gotovariation(i_reader,variations,board)
    return i_reader,board

def checkexistingvariations(i_reader,variations):
    lvar = []
    compt = 1
    i = i_reader+1
    while variations[i][0]=='{':
        i+=1
    lvar.append((i,variations[i][0]))
    while (compt > 0 or variations[i][0]=='{') and i<len(variations)-1:
        if variations[i][0]=='{':
            compt+=1
        if variations[i][0]=='}':
            compt-=1
        if variations[i][0]!='{' and variations[i][0]!='}' and compt==1 and variations[i-1][0]=='{':
            lvar.append((i,variations[i][0]))
        i+=1
    if i<len(variations)-1:
        if variations[i+1][0]!='{' and variations[i][0]!='}':
            lvar.append((i,variations[i][0]))
    return lvar
            
            