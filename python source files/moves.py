# -*- coding: utf-8 -*-
"""
Created on Thu Sep 19 16:00:58 2019

@author: Thibault Vieu
"""
from util import *

def add(board,l):
    for piece in l:
        cp = nb_to_coord(piece[0])
        board[cp[0]][cp[1]] = piece[1]
    return board

def remove(board,l):
    for piece in l:
        cp = nb_to_coord(piece[0])
        board[cp[0]][cp[1]] = 0
    return board


def checkshieldwallud(board,cf1,cf2,ci1,ci2,direction):
    lsw = []
    sw = 0
    i=direction
    while sw==0:
        if board[cf1][cf2+i]*board[ci1][ci2] < 0 and board[cf1+int((cf1==0))-int((cf1==10))][cf2+i]*board[ci1][ci2] > 0:
            if board[cf1][cf2+i]!=2:
                lsw.append(cf1*11+cf2+i)
            i+=direction
        else:
            if board[cf1][cf2+i]*board[ci1][ci2] <= 0:
                sw = -1
            if board[cf1][cf2+i]*board[ci1][ci2] > 0 or cf2+i==10 or cf2+i==0:
                sw = 1
    if sw==1:
        return lsw
    else:
        return []
    
def checkshieldwalllr(board,cf1,cf2,ci1,ci2,direction):
    lsw = []
    sw = 0
    i=direction
    while sw==0:
        if board[cf1+i][cf2]*board[ci1][ci2] < 0 and board[cf1+i][cf2+int((cf2==0))-int((cf2==10))]*board[ci1][ci2] > 0:
            if board[cf1+i][cf2]!=2:
                lsw.append((cf1+i)*11+cf2)
            i+=direction
        else:
            if board[cf1+i][cf2]*board[ci1][ci2] <= 0:
                sw = -1
            if board[cf1+i][cf2]*board[ci1][ci2] > 0 or cf1+i==10 or cf1+i==0:
                sw = 1
    if sw==1:
        return lsw
    else:
        return []

def capture(ci,cf,board):#look for captures around the pawn at cf coming from ci
    cf1,cf2 = nb_to_coord(cf)
    ci1,ci2 = nb_to_coord(ci)
    captured=[]
    if(cf1+2<11):
        if (board[cf1+2][cf2]*board[ci1][ci2]>0 or (cf1,cf2)==(8,0) or (cf1,cf2)==(8,10) ) and board[cf1+1][cf2]*board[ci1][ci2]==-1:
            captured.append((cf1+1)*11+cf2)
    if(cf1-2>=0):
        if (board[cf1-2][cf2]*board[ci1][ci2]>0 or (cf1,cf2)==(2,0) or (cf1,cf2)==(2,10)) and board[cf1-1][cf2]*board[ci1][ci2]==-1:
            captured.append((cf1-1)*11+cf2)
    if(cf2+2<11):
        if (board[cf1][cf2+2]*board[ci1][ci2]>0 or (cf1,cf2)==(10,8) or (cf1,cf2)==(0,8)) and board[cf1][cf2+1]*board[ci1][ci2]==-1:
            captured.append(cf1*11+cf2+1)
    if(cf2-2>=0):
        if (board[cf1][cf2-2]*board[ci1][ci2]>0 or (cf1,cf2)==(0,2) or (cf1,cf2)==(10,2)) and board[cf1][cf2-1]*board[ci1][ci2]==-1:
            captured.append(cf1*11+cf2-1)
    if cf1 == 0 or cf1==10:
        if cf2!=8:
            captured+=checkshieldwallud(board,cf1,cf2,ci1,ci2,1)
        if cf2!=2:
            captured+=checkshieldwallud(board,cf1,cf2,ci1,ci2,-1)
    if cf2 == 0 or cf2==10:
        if cf1!=8:
            captured+=checkshieldwalllr(board,cf1,cf2,ci1,ci2,1)
        if cf1!=2:
            captured+=checkshieldwalllr(board,cf1,cf2,ci1,ci2,-1)
    return captured

def add_move(ci,cf,board,i_reader,variations):#move from ci to cf
    i,j = nb_to_coord(cf)
    si,sj = nb_to_coord(ci)
    captured = capture(ci,cf,board)
    i_reader+=1
    variations.insert(i_reader,[(ci,cf,captured),[],""])
    selection = -1000
    return selection, variations, i_reader
    
def playmove(board,move,direction,i_reader,variations):
    if move!=-1:
        (m1,m2,captured) = move
        i1,j1 = int(m1/11),m1-int(m1/11)*11
        i2,j2 = int(m2/11),m2-int(m2/11)*11
        if direction==1:
            board[i2][j2] = board[i1][j1]
            board[i1][j1] = 0
            for c in captured:
                ci,cj = int(c/11),c-int(c/11)*11
                board[ci][cj]=0
        if direction==-1:
            for c in captured:
                ci,cj = int(c/11),c-int(c/11)*11
                if board[i2][j2]>0:
                    board[ci][cj]=-1
                else:
                    board[ci][cj]=1
            board[i1][j1] = board[i2][j2]
            board[i2][j2] = 0
    else:
        ladd = variations[i_reader][1]
        lrem = variations[i_reader][2]
        if direction==1:
            board = add(board,ladd)
            board = remove(board,lrem)
        if direction==-1:
            board = add(board,lrem)
            board = remove(board,ladd)
    return board