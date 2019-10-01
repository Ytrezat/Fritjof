# -*- coding: utf-8 -*-
"""
Created on Wed Sep 18 17:14:32 2019

@author: Thibault Vieu
"""
from util import *
from moves import add_move
from variations import add_variation

def addpawn(selection,i_reader,variations,piece,board):
    selection = abs(selection)
    coor = nb_to_coord(selection)
    if variations[i_reader+1][0]!='}':
        i_reader,variations = add_variation(i_reader,variations)
        s, variations, i_reader = add_move(selection,selection,board,i_reader,variations)
        variations[i_reader] = [-1,[],[],[],'']
    if variations[i_reader][0]!=-1:
        s, variations, i_reader = add_move(selection,selection,board,i_reader,variations)
        variations[i_reader] = [-1,[],[],[],'']
    inadd=False
    inrem = False
    for k in range(len(variations[i_reader][1])):
        if variations[i_reader][1][k][0] == selection:
            inadd = True
            variations[i_reader][1][k] = (selection,piece)
    if not inadd:
        for j in range(len(variations[i_reader][2])):
            if variations[i_reader][2][j][0] == selection:
                del variations[i_reader][2][j]
                inrem=True
                break

        if not inrem:
            variations[i_reader][1].append((selection,piece))
    board[coor[0]][coor[1]] = piece
    selection = -1000
    return selection,i_reader,variations,board

def removepawn(selection,i_reader,variations,board):
    coor = nb_to_coord(selection)
    if board[coor[0]][coor[1]]!=0:
        selection = abs(selection)
        coor = nb_to_coord(selection)
        if variations[i_reader+1][0]!='}':
            i_reader,variations = add_variation(i_reader,variations)
            s, variations, i_reader = add_move(selection,selection,board,i_reader,variations)
            variations[i_reader] = [-1,[],[],[],'']
        if variations[i_reader][0]!=-1:
            s, variations, i_reader = add_move(selection,selection,board,i_reader,variations)
            variations[i_reader] = [-1,[],[],[],'']
        inadd=False
        inrem = False
        for k in range(len(variations[i_reader][2])):
            if variations[i_reader][2][k][0] == selection:
                inrem = True
        if not inrem:
            for j in range(len(variations[i_reader][1])):
                if variations[i_reader][1][j][0] == selection:
                    del variations[i_reader][1][j]
                    inadd=True
                    break
    
            if not inadd:
                variations[i_reader][2].append((selection,board[coor[0]][coor[1]]))
        board[coor[0]][coor[1]] = 0
    return selection,i_reader,variations,board